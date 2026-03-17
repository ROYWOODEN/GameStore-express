import { prisma } from '#src/core/prisma.js';

export const createUserRecord = async ({ name, email, passwordHash }) => {
  return prisma.users.create({
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
