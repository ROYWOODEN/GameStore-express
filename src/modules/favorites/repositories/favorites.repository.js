import { prisma } from '#src/core/prisma.js';

const FAVORITE_GAME_INCLUDE = {
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

export const findFavoriteGameByIdRecord = async ({ gameId }, db = prisma) => {
  return db.games.findUnique({
    where: {
      id: gameId,
    },
    include: FAVORITE_GAME_INCLUDE,
  });
};

export const findFavoritesByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.favourites.findMany({
    where: {
      user_id: userId,
    },
    include: {
      games: {
        include: FAVORITE_GAME_INCLUDE,
      },
    },
    orderBy: {
      id: 'desc',
    },
  });
};

export const findFavoriteGameIdsByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.favourites.findMany({
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

export const findFavoriteByUserAndGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.favourites.findFirst({
    where: {
      user_id: userId,
      game_id: gameId,
    },
  });
};

export const createFavoriteRecord = async ({ userId, gameId }, db = prisma) => {
  return db.favourites.create({
    data: {
      user_id: userId,
      game_id: gameId,
    },
  });
};

export const deleteFavoriteByUserAndGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.favourites.deleteMany({
    where: {
      user_id: userId,
      game_id: gameId,
    },
  });
};
