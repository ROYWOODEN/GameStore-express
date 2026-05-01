import { prisma } from '#src/core/prisma.js';
import { buildTargetFileUrl } from '#src/modules/files/index.js';

const GAME_IMAGES_ORDER_BY = [{ sort_order: 'asc' }, { id: 'asc' }];

export const findGameImagesByGameIdRecord = async ({ gameId }, db = prisma) => {
  return db.game_images.findMany({
    where: {
      game_id: gameId,
    },
    orderBy: GAME_IMAGES_ORDER_BY,
  });
};

export const findGameImageByIdRecord = async ({ gameId, imageId }, db = prisma) => {
  return db.game_images.findFirst({
    where: {
      id: imageId,
      game_id: gameId,
    },
  });
};

export const findLastGameImageRecord = async ({ gameId }, db = prisma) => {
  return db.game_images.findFirst({
    where: {
      game_id: gameId,
    },
    orderBy: [{ sort_order: 'desc' }, { id: 'desc' }],
  });
};

export const createGameImagesRecord = async ({ gameId, gameTitle, files }, db = prisma) => {
  const lastImage = await findLastGameImageRecord({ gameId }, db);
  const nextSortOrder = lastImage ? lastImage.sort_order + 1 : 0;

  const createdImages = [];

  for (const [index, file] of files.entries()) {
    const createdImage = await db.game_images.create({
      data: {
        game_id: gameId,
        url: buildTargetFileUrl('game_images', file.filename),
        alt: gameTitle,
        sort_order: nextSortOrder + index,
      },
    });

    createdImages.push(createdImage);
  }

  return createdImages;
};

export const deleteGameImageByIdRecord = async ({ imageId }, db = prisma) => {
  return db.game_images.delete({
    where: {
      id: imageId,
    },
  });
};

export const updateGameImageSortOrderRecord = async ({ imageId, sortOrder }, db = prisma) => {
  return db.game_images.update({
    where: {
      id: imageId,
    },
    data: {
      sort_order: sortOrder,
    },
  });
};
