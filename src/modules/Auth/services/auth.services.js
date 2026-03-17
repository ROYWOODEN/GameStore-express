import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { prisma } from '#src/core/prisma.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  createUserRecord,
  createUserSessionRecord,
  updateUserSessionRecord,
} from '../repositories/auth.repository.js';
import { getTokenExpiresAt, signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { registerSchema } from '../validators/auth.schemas.js';

const buildResponseUser = (createdUser) => {
  const { roles, ...userData } = createdUser;

  return {
    ...userData,
    role: roles.name,
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

    const responseUser = buildResponseUser(createdUser);
    const accessToken = signAccessToken({ userId: responseUser.id, role: responseUser.role });

    const session = await createUserSessionRecord(
      {
        userId: responseUser.id,
        refreshTokenHash: '',
        userAgent,
        ip,
        expiresAt: new Date(),
      },
      tx,
    );

    const refreshToken = signRefreshToken({
      userId: responseUser.id,
      sessionId: session.id,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenExpiresAt = getTokenExpiresAt(refreshToken);

    await updateUserSessionRecord(
      {
        sessionId: session.id,
        refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
      tx,
    );

    return {
      user: responseUser,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  });
};
