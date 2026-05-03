import { prisma } from '#src/core/prisma.js';

const BASKET_GAME_INCLUDE = {
  game_images: {
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    take: 1,
  },
  game_tags: {
    include: {
      tags: {
        include: {
          tag_types: true,
        },
      },
    },
  },
};

export const findBasketGameByIdRecord = async ({ gameId }, db = prisma) => {
  return db.games.findUnique({
    where: {
      id: gameId,
    },
    include: BASKET_GAME_INCLUDE,
  });
};

export const findBasketByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.basket.findMany({
    where: {
      user_id: userId,
    },
    include: {
      games: {
        include: BASKET_GAME_INCLUDE,
      },
    },
    orderBy: {
      id: 'desc',
    },
  });
};

export const findBasketGameIdsByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.basket.findMany({
    where: {
      user_id: userId,
    },
    select: {
      game_id: true,
    },
    orderBy: {
      id: 'desc',
    },
  });
};

export const findBasketByUserAndGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.basket.findFirst({
    where: {
      user_id: userId,
      game_id: gameId,
    },
  });
};

export const createBasketRecord = async ({ userId, gameId }, db = prisma) => {
  return db.basket.create({
    data: {
      user_id: userId,
      game_id: gameId,
    },
  });
};

export const deleteBasketByUserAndGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.basket.deleteMany({
    where: {
      user_id: userId,
      game_id: gameId,
    },
  });
};

export const deleteBasketByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.basket.deleteMany({
    where: {
      user_id: userId,
    },
  });
};
