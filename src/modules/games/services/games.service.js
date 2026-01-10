import { PrismaClient } from '@prisma/client';
import { formatGame, formatGameList } from '#src/mappers/game.mappers.js';

const prisma = new PrismaClient();

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

  return formatGame(result);
};

export const createGame = async (game) => {
  await prisma.games.create({
    data: {
      title: game.title,
      description: game.description,
      price: game.price,
    },
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
