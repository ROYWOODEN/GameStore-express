import { prisma } from '#src/core/prisma.js';
import { buildTargetFileUrl } from '#src/modules/files/index.js';

const GAME_LIST_INCLUDE = {
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

const GAME_DETAIL_INCLUDE = {
  game_images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
  game_videos: true,
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

export const findManyGames = async () => {
  return prisma.games.findMany({
    include: GAME_LIST_INCLUDE,
  });
};

export const findGameById = async (id) => {
  return prisma.games.findUnique({
    where: {
      id,
    },
    include: GAME_DETAIL_INCLUDE,
  });
};

export const createGameWithImagesRecord = async (game, files) => {
  const created = await prisma.$transaction(async (tx) => {
    const gameRow = await tx.games.create({
      data: {
        title: game.title,
        description: game.description,
        price: game.price,
      },
      select: {
        id: true,
      },
    });

    if (files?.length) {
      await tx.game_images.createMany({
        data: files.map((file, index) => ({
          game_id: gameRow.id,
          url: buildTargetFileUrl('game_images', file.filename),
          alt: game.title,
          sort_order: index,
        })),
      });
    }

    return gameRow;
  });

  return created.id;
};

export const findGameImagesByGameId = async (id) => {
  return prisma.game_images.findMany({
    where: {
      game_id: id,
    },
  });
};

export const deleteGameById = async (id) => {
  await prisma.games.delete({
    where: {
      id,
    },
  });
};

export const updateGameById = async (id, data) => {
  await prisma.games.update({
    where: {
      id,
    },
    data,
  });
};
