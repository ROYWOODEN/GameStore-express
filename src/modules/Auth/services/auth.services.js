import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { prisma } from '#src/core/prisma.js';
import { mapUserProfile } from '#src/modules/user/mappers/user.mapper.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  createOAuthUserRecord,
  createUserRecord,
  createUserProviderRecord,
  createUserSessionRecord,
  findUserByEmailRecord,
  findUserProviderByProviderUserIdRecord,
  getUserSessionById,
  loginUserRecord,
  revokeUserSessionRecord,
  updateUserAvatarIfMissingRecord,
  updateUserProviderRecord,
  updateUserSessionRecord,
  upsertAuthProviderRecord,
} from '../repositories/auth.repository.js';
import { compareRefreshToken } from '../utils/refresh-token-hash.js';
import { verifyToken } from '../utils/tokens.js';
import { getAbsoluteSessionExpiresAt } from '../utils/session-expiration.js';
import { generateSessionTokens } from '../utils/session-tokens.js';
import { loginSchema, registerSchema } from '../validators/auth.schemas.js';

const GOOGLE_PROVIDER = {
  code: 'google',
  name: 'Google',
};

const normalizeOAuthUserName = ({ displayName, givenName, email }) => {
  const candidates = [givenName, displayName, email?.split('@')[0], 'Google User'];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized) {
      return normalized.slice(0, 20);
    }
  }

  return 'Google User';
};

const normalizeGoogleProfile = (profile) => {
  const providerUserId = String(profile?.id ?? '').trim();
  const providerEmail =
    profile?.emails
      ?.find((item) => item?.value)
      ?.value?.trim()
      .toLowerCase() ?? '';
  const avatarUrl = profile?.photos?.find((item) => item?.value)?.value?.trim() ?? null;
  const emailVerified = profile?._json?.email_verified;

  if (!providerUserId) {
    throw new AppError({
      debug: 'Google OAuth profile is missing provider user id',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_OAUTH_FAILED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }

  if (!providerEmail) {
    throw new AppError({
      debug: 'Google OAuth profile is missing email',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_OAUTH_FAILED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      details: { fields: ['email'] },
    });
  }

  if (emailVerified === false) {
    throw new AppError({
      debug: `Google OAuth email is not verified for ${providerEmail}`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_OAUTH_FAILED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      details: { fields: ['email'] },
    });
  }

  return {
    providerUserId,
    email: providerEmail,
    providerEmail,
    avatarUrl,
    name: normalizeOAuthUserName({
      displayName: profile?.displayName,
      givenName: profile?.name?.givenName,
      email: providerEmail,
    }),
  };
};

const createSessionBundle = async ({ userId, userAgent, ip }, tx) => {
  const absoluteSessionExpiresAt = getAbsoluteSessionExpiresAt();

  const session = await createUserSessionRecord(
    {
      userId,
      refreshTokenHash: '',
      userAgent,
      ip,
      expiresAt: new Date(),
      absoluteExpiresAt: absoluteSessionExpiresAt,
    },
    tx,
  );

  const { accessToken, refreshToken, refreshTokenHash, refreshTokenExpiresAt } =
    await generateSessionTokens({
      userId,
      sessionId: session.id,
      absoluteExpiresAt: absoluteSessionExpiresAt,
    });

  await updateUserSessionRecord(
    {
      sessionId: session.id,
      refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
    tx,
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
};

export const registerUser = async ({ body, userAgent, ip }) => {
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid registration data',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.AUTH_VALIDATION,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const { password, ...user } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    let createdUser;
    try {
      createdUser = await createUserRecord(
        {
          ...user,
          passwordHash,
        },
        tx,
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const targetFields = getPrismaTargetFields(error.meta?.target);

        if (targetFields.includes('email')) {
          throw new AppError({
            debug: error.message || 'Email already exists',
            type: ERROR_TYPES.VALIDATION,
            message: ERROR_MESSAGES.AUTH_EMAIL_TAKEN,
            statusCode: HTTP_STATUS.CONFLICT,
            details: { fields: ['email'] },
          });
        }
      }

      throw error;
    }

    const responseUser = mapUserProfile(createdUser);
    const sessionBundle = await createSessionBundle(
      {
        userId: responseUser.id,
        userAgent,
        ip,
      },
      tx,
    );

    return {
      user: responseUser,
      ...sessionBundle,
    };
  });
};

export const loginUser = async ({ body, userAgent, ip }) => {
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid login data',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.AUTH_VALIDATION,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const { email, password } = parsed.data;

  const user = await loginUserRecord({ email });
  if (!user) {
    throw new AppError({
      debug: 'Invalid credentials',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS,
    });
  }

  const { password_hash, ...resultUser } = user;

  if (!password_hash) {
    throw new AppError({
      debug: `User ${email} has no password hash and cannot use password login`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS,
    });
  }

  const isValidPassword = await bcrypt.compare(password, password_hash);

  if (!isValidPassword) {
    throw new AppError({
      debug: 'Invalid credentials',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS,
    });
  }
  const responseUser = mapUserProfile(resultUser);

  return prisma.$transaction(async (tx) => {
    const sessionBundle = await createSessionBundle(
      {
        userId: responseUser.id,
        userAgent,
        ip,
      },
      tx,
    );

    return {
      user: responseUser,
      ...sessionBundle,
    };
  });
};

export const authenticateGoogleUser = async ({ profile, userAgent, ip }) => {
  const googleProfile = normalizeGoogleProfile(profile);

  return prisma.$transaction(async (tx) => {
    const provider = await upsertAuthProviderRecord(GOOGLE_PROVIDER, tx);

    if (!provider.is_active) {
      throw new AppError({
        debug: 'Google auth provider is disabled',
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN,
      });
    }

    const existingProviderLink = await findUserProviderByProviderUserIdRecord(
      {
        providerId: provider.id,
        providerUserId: googleProfile.providerUserId,
      },
      tx,
    );

    let userRecord = existingProviderLink?.users ?? null;

    if (existingProviderLink) {
      if (existingProviderLink.provider_email !== googleProfile.providerEmail) {
        await updateUserProviderRecord(
          {
            providerUserId: googleProfile.providerUserId,
            providerEmail: googleProfile.providerEmail,
          },
          tx,
        );
      }
    } else {
      userRecord = await findUserByEmailRecord({ email: googleProfile.email }, tx);

      if (!userRecord) {
        userRecord = await createOAuthUserRecord(
          {
            name: googleProfile.name,
            email: googleProfile.email,
            avatarUrl: googleProfile.avatarUrl,
          },
          tx,
        );
      }

      await createUserProviderRecord(
        {
          userId: userRecord.id,
          providerId: provider.id,
          providerUserId: googleProfile.providerUserId,
          providerEmail: googleProfile.providerEmail,
        },
        tx,
      );
    }

    if (googleProfile.avatarUrl) {
      await updateUserAvatarIfMissingRecord(
        {
          userId: userRecord.id,
          avatarUrl: googleProfile.avatarUrl,
        },
        tx,
      );
    }

    const responseUser = mapUserProfile({
      ...userRecord,
      avatar_url: userRecord.avatar_url ?? googleProfile.avatarUrl,
    });

    const sessionBundle = await createSessionBundle(
      {
        userId: userRecord.id,
        userAgent,
        ip,
      },
      tx,
    );

    return {
      user: responseUser,
      ...sessionBundle,
    };
  });
};

export const refreshUserTokens = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError({
      debug: 'Missing refresh token on refresh',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  let refreshPayload;

  try {
    refreshPayload = verifyToken({
      token: refreshToken,
      type: 'refresh',
    });
  } catch (error) {
    if (error?.name !== 'TokenExpiredError') {
      throw new AppError({
        debug: error?.message || 'Refresh token verification failed',
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
      });
    }

    const expiredRefreshPayload = verifyToken({
      token: refreshToken,
      type: 'refresh',
      ignoreExpiration: true,
    });

    let expiredSessionId;
    try {
      expiredSessionId = BigInt(expiredRefreshPayload.sessionId);
    } catch {
      throw new AppError({
        debug: 'Invalid session id in refresh token',
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
      });
    }

    await revokeUserSessionRecord({
      sessionId: expiredSessionId,
      revokedAt: new Date(),
    });

    throw new AppError({
      debug: `Refresh token expired for session ${expiredSessionId}`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  let sessionId;
  try {
    sessionId = BigInt(refreshPayload.sessionId);
  } catch {
    throw new AppError({
      debug: 'Invalid session id in refresh token',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  const session = await getUserSessionById({ sessionId });

  if (!session) {
    throw new AppError({
      debug: `Session ${sessionId} was not found on refresh`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  if (session.revoked_at) {
    throw new AppError({
      debug: `Session ${sessionId} is already revoked`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  if (String(session.user_id) !== String(refreshPayload.userId)) {
    await revokeUserSessionRecord({
      sessionId,
      revokedAt: new Date(),
    });

    throw new AppError({
      debug: `Refresh token user does not match session user for session ${sessionId}`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  const now = new Date();

  if (session.absolute_expires_at.getTime() <= now.getTime()) {
    await revokeUserSessionRecord({
      sessionId,
      revokedAt: new Date(),
    });

    throw new AppError({
      debug: `Session ${sessionId} exceeded its absolute lifetime`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  if (session.expires_at.getTime() <= now.getTime()) {
    await revokeUserSessionRecord({
      sessionId,
      revokedAt: new Date(),
    });

    throw new AppError({
      debug: `Session ${sessionId} exceeded its refresh lifetime`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  const isCurrentToken =
    Boolean(session.refresh_token_hash) &&
    compareRefreshToken(refreshToken, session.refresh_token_hash);

  if (!isCurrentToken) {
    await revokeUserSessionRecord({
      sessionId,
      revokedAt: new Date(),
    });

    throw new AppError({
      debug: `Refresh token hash mismatch for session ${sessionId} on refresh`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_REFRESH_FAILED,
    });
  }

  return prisma.$transaction(async (tx) => {
    const {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    } = await generateSessionTokens({
      userId: session.user_id,
      sessionId: session.id,
      absoluteExpiresAt: session.absolute_expires_at,
    });

    await updateUserSessionRecord(
      {
        sessionId: session.id,
        refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
      tx,
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt,
    };
  });
};

export const logoutUser = async ({ refreshToken }) => {
  if (!refreshToken) {
    return;
  }

  let refreshPayload;

  try {
    refreshPayload = verifyToken({
      token: refreshToken,
      type: 'refresh',
    });
  } catch (error) {
    if (error?.name !== 'TokenExpiredError') {
      return;
    }

    try {
      refreshPayload = verifyToken({
        token: refreshToken,
        type: 'refresh',
        ignoreExpiration: true,
      });
    } catch {
      return;
    }
  }

  let sessionId;
  try {
    sessionId = BigInt(refreshPayload.sessionId);
  } catch {
    return;
  }

  const session = await getUserSessionById({ sessionId });

  if (!session || session.revoked_at) {
    return;
  }

  if (String(session.user_id) !== String(refreshPayload.userId)) {
    return;
  }

  await revokeUserSessionRecord({
    sessionId,
    revokedAt: new Date(),
  });
};
