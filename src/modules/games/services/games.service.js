import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getGames = async () => {
  try {
    const result = await prisma.games.findMany();
    return result;
  } catch (error) {
    throw error;
  }
};

export const getGameById = async (id) => {
  try {
    const result = await prisma.games.findUnique({
      where: {
        id_game: id,
      },
    });

    return result;
  } catch (error) {
    throw error;
  }
};

export const createGame = async (game) => {
  try {
    await prisma.games.create({
      data: {
        title: game.title,
        description: game.description,
        price: game.price,
        image_url: game.image_url,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteGame = async (id) => {
  try {
    await prisma.games.delete({
      where: {
        id_game: id,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const updateGame = async (id, game) => {
  let updated = {};

  if (game.title !== undefined) updated.title = game.title;
  if (game.description !== undefined) updated.description = game.description;
  if (game.price !== undefined) updated.price = game.price;
  if (game.image_url !== undefined) updated.image_url = game.image_url;

  try {
    await prisma.games.update({
      where: {
        id_game: id,
      },
      data: updated,
    });
  } catch (error) {
    throw error;
  }
};
