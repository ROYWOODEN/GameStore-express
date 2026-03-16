import { prisma } from '#src/core/prisma.js';

export const createUser = async (user, hashedPassword) => {
  const created = await prisma.users.create({
    data: {
      name: user.name,
      email: user.email,
      password_hash: hashedPassword,
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

  return created;
};
