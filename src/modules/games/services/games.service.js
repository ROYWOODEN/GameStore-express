import { prisma } from '#src/core/prisma.js';
import { formatGame, formatGameList } from '#src/modules/games/mappers/game.mappers.js';

export const getGames = async () => {
  const result = await prisma.games.findMany({
    include: {
      game_images: true,
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
      id_game: id,
    },
    include: {
      game_images: true,
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

export const createGame = async (game) => {
  const created = await prisma.games.create({
    data: {
      title: game.title,
      description: game.description,
      price: game.price,
    },
    select: {
      id_game: true,
    },
  });
  return created.id_game;
};

export const createGameImages = async (gameId, files, title) => {
  if (!files?.length) return;

  const data = files.map((f) => ({
    game_id: gameId,
    url: `/uploads/images/games/${f.filename}`,
    alt: title,
  }));

  await prisma.game_images.createMany({
    data,
  });
};

export const deleteGame = async (id) => {
  await prisma.games.delete({
    where: {
      id_game: id,
    },
  });
};

export const updateGame = async (id, update) => {
  await prisma.games.update({
    where: {
      id_game: id,
    },
    data: update,
  });
};
