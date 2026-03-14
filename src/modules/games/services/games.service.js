import { prisma } from '#src/core/prisma.js';
import { formatGame, formatGameList } from '#src/modules/games/mappers/game.mappers.js';

export const getGames = async () => {
  const result = await prisma.games.findMany({
    include: {
      game_images: {
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        take: 1,
      },
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
    },
  });

  return result.map(formatGameList);
};

export const getGameById = async (id) => {
  const result = await prisma.games.findUnique({
    where: {
      id: id,
    },
    include: {
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
    },
  });

  return result !== null ? formatGame(result) : null;
};

// Transaction: game and images are written atomically.
export const createGameWithImages = async (game, files, title) => {
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
        data: files.map((f, index) => ({
          game_id: gameRow.id,
          url: `/uploads/images/games/${f.filename}`,
          alt: title,
          sort_order: index,
        })),
      });
    }

    return gameRow;
  });

  return created.id;
};

export const getGameImages = async (id) => {
  const images = await prisma.game_images.findMany({
    where: {
      game_id: id,
    },
  });

  return images;
};

export const deleteGame = async (id) => {
  await prisma.games.delete({
    where: {
      id: id,
    },
  });
};

export const updateGame = async (id, update) => {
  await prisma.games.update({
    where: {
      id: id,
    },
    data: update,
  });
};
