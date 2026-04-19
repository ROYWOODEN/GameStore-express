import { prisma } from '#src/core/prisma.js';

export const createUserRecord = async ({ name, email, passwordHash }, db = prisma) => {
  return db.users.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
    },
    omit: {
      password_hash: true,
      role_id: true,
    },
    include: {
      roles: {
        select: {
          name: true,
        },
      },
    },
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
    omit: {
      role_id: true,
    },
    include: {
      roles: {
        select: {
          name: true,
        },
      },
    },
  });
};
