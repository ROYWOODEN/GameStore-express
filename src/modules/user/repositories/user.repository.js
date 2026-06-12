import { prisma } from '#src/core/prisma.js';

const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  password_hash: true,
  avatar_url: true,
  created_at: true,
  roles: {
    select: {
      name: true,
    },
  },
  user_providers: {
    select: {
      providers: {
        select: {
          code: true,
        },
      },
    },
  },
};

export const findUserProfileByIdRecord = async ({ userId }, db = prisma) => {
  return db.users.findUnique({
    where: {
      id: userId,
    },
    select: USER_PROFILE_SELECT,
  });
};

export const updateUserProfileByIdRecord = async ({ userId, data }, db = prisma) => {
  return db.users.update({
    where: {
      id: userId,
    },
    data,
    select: USER_PROFILE_SELECT,
  });
};

export const deleteUserByIdRecord = async ({ userId }, db = prisma) => {
  return db.users.deleteMany({
    where: {
      id: userId,
    },
  });
};

export const deleteUserProviderByCodeRecord = async ({ userId, providerCode }, db = prisma) => {
  return db.user_providers.deleteMany({
    where: {
      user_id: userId,
      providers: {
        code: providerCode,
      },
    },
  });
};
