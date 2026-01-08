import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getGames = async () => {
  const result = await prisma.games.findMany();
  return result;
};

export const getGameById = async (id) => {
  const result = await prisma.games.findUnique({
    where: {
      id_game: id,
    },
  });

  return result;
};

export const createGame = async (game) => {
  await prisma.games.create({
    data: {
      title: game.title,
      description: game.description,
      price: game.price,
      image_url: game.image_url,
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
