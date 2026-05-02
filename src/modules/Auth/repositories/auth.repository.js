import { prisma } from '#src/core/prisma.js';

const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar_url: true,
  created_at: true,
  roles: {
    select: {
      name: true,
    },
  },
};

const LOGIN_USER_SELECT = {
  ...USER_PROFILE_SELECT,
  password_hash: true,
};

export const createUserRecord = async ({ name, email, passwordHash }, db = prisma) => {
  return db.users.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
    },
    select: USER_PROFILE_SELECT,
  });
};

export const createUserSessionRecord = async (
  { userId, refreshTokenHash, userAgent, ip, expiresAt, absoluteExpiresAt },
  db = prisma,
) => {
  return db.user_sessions.create({
    data: {
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      user_agent: userAgent ?? null,
      ip: ip ?? null,
      expires_at: expiresAt,
      absolute_expires_at: absoluteExpiresAt,
    },
  });
};

export const updateUserSessionRecord = async (
  { sessionId, refreshTokenHash, expiresAt },
  db = prisma,
) => {
  return db.user_sessions.update({
    where: {
      id: sessionId,
    },
    data: {
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
    },
  });
};

export const getUserSessionById = async ({ sessionId }, db = prisma) => {
  return db.user_sessions.findUnique({
    where: {
      id: sessionId,
    },
  });
};

export const revokeUserSessionRecord = async ({ sessionId, revokedAt }, db = prisma) => {
  return db.user_sessions.updateMany({
    where: {
      id: sessionId,
      revoked_at: null,
    },
    data: {
      revoked_at: revokedAt,
    },
  });
};

export const loginUserRecord = async ({ email }) => {
  return prisma.users.findUnique({
    where: {
      email,
    },
    select: LOGIN_USER_SELECT,
  });
};

export const findUserRoleByIdRecord = async ({ userId }) => {
  return prisma.users.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      roles: {
        select: {
          name: true,
        },
      },
    },
  });
};

export const upsertAuthProviderRecord = async ({ code, name }, db = prisma) => {
  return db.providers.upsert({
    where: {
      code,
    },
    update: {
      name,
    },
    create: {
      code,
      name,
      is_active: true,
    },
  });
};

export const findUserProviderByProviderUserIdRecord = async (
  { providerId, providerUserId },
  db = prisma,
) => {
  return db.user_providers.findFirst({
    where: {
      provider_id: providerId,
      provider_user_id: providerUserId,
    },
    include: {
      users: {
        select: USER_PROFILE_SELECT,
      },
    },
  });
};

export const findUserByEmailRecord = async ({ email }, db = prisma) => {
  return db.users.findUnique({
    where: {
      email,
    },
    select: USER_PROFILE_SELECT,
  });
};

export const createOAuthUserRecord = async ({ name, email, avatarUrl }, db = prisma) => {
  return db.users.create({
    data: {
      name,
      email,
      avatar_url: avatarUrl ?? null,
      password_hash: null,
    },
    select: USER_PROFILE_SELECT,
  });
};

export const createUserProviderRecord = async (
  { userId, providerId, providerUserId, providerEmail },
  db = prisma,
) => {
  return db.user_providers.create({
    data: {
      user_id: userId,
      provider_id: providerId,
      provider_user_id: providerUserId,
      provider_email: providerEmail ?? null,
    },
  });
};

export const updateUserProviderRecord = async ({ providerUserId, providerEmail }, db = prisma) => {
  return db.user_providers.update({
    where: {
      provider_user_id: providerUserId,
    },
    data: {
      provider_email: providerEmail ?? null,
    },
  });
};

export const updateUserAvatarIfMissingRecord = async ({ userId, avatarUrl }, db = prisma) => {
  return db.users.updateMany({
    where: {
      id: userId,
      avatar_url: null,
    },
    data: {
      avatar_url: avatarUrl,
    },
  });
};
