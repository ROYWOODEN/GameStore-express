import { prisma } from '#src/core/prisma.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { cleanupTargetUrls, cleanupUploadedFiles } from '#src/modules/files/index.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { findGameById } from '../repositories/games.repository.js';
import {
  createGameImagesRecord,
  deleteGameImageByIdRecord,
  findGameImageByIdRecord,
  findGameImagesByGameIdRecord,
  updateGameImageSortOrderRecord,
} from '../repositories/games-images.repository.js';
import { updateGameImagesOrderSchema } from '../validators/games-images.schemas.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const buildGameImageNotFoundError = () =>
  new AppError({
    debug: 'Game image not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game_image' },
  });

const parseGameEntityId = (value, field) => {
  try {
    return BigInt(value);
  } catch {
    throw new AppError({
      debug: `Invalid ${field}: ${value}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: {
        fields: [field],
      },
    });
  }
};

const ensureGameExists = async (gameId) => {
  const game = await findGameById(gameId);

  if (!game) {
    throw buildGameNotFoundError();
  }

  return game;
};

const normalizeGameImageSortOrders = async ({ gameId }, db = prisma) => {
  const images = await findGameImagesByGameIdRecord({ gameId }, db);

  for (const [index, image] of images.entries()) {
    if (image.sort_order === index) {
      continue;
    }

    await updateGameImageSortOrderRecord(
      {
        imageId: image.id,
        sortOrder: index,
      },
      db,
    );
  }

  return findGameImagesByGameIdRecord({ gameId }, db);
};

export const addGameImages = async ({ gameId: rawGameId, files }) => {
  if (!files || files.length === 0) {
    throw new AppError({
      debug: 'No images uploaded',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.FILES_REQUIRED,
      details: { resource: 'game', field: 'images' },
    });
  }

  const gameId = parseGameEntityId(rawGameId, 'gameId');

  let game;
  try {
    game = await ensureGameExists(gameId);
  } catch (error) {
    cleanupUploadedFiles(files, {
      scope: 'games.images.add',
      reason: 'game_not_found',
      gameId: String(rawGameId),
    });

    throw error;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await createGameImagesRecord(
        {
          gameId,
          gameTitle: game.title,
          files,
        },
        tx,
      );

      return findGameImagesByGameIdRecord({ gameId }, tx);
    });
  } catch (error) {
    cleanupUploadedFiles(files, {
      scope: 'games.images.add',
      reason: 'db_error',
      gameId: String(gameId),
    });

    throw error;
  }
};

export const removeGameImage = async ({ gameId: rawGameId, imageId: rawImageId }) => {
  const gameId = parseGameEntityId(rawGameId, 'gameId');
  const imageId = parseGameEntityId(rawImageId, 'imageId');

  await ensureGameExists(gameId);

  const image = await findGameImageByIdRecord({ gameId, imageId });

  if (!image) {
    throw buildGameImageNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await deleteGameImageByIdRecord({ imageId }, tx);
    await normalizeGameImageSortOrders({ gameId }, tx);
  });

  cleanupTargetUrls(image.url, 'game_images', {
    scope: 'games.images.delete',
    gameId: String(gameId),
    imageId: String(imageId),
  });
};

export const reorderGameImages = async ({ gameId: rawGameId, body }) => {
  const gameId = parseGameEntityId(rawGameId, 'gameId');

  const parsed = updateGameImagesOrderSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid game images order payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  await ensureGameExists(gameId);

  const existingImages = await findGameImagesByGameIdRecord({ gameId });
  const existingImageIds = existingImages.map((image) => String(image.id));
  const requestedImageIds = parsed.data.imageIds.map(String);

  if (existingImageIds.length !== requestedImageIds.length) {
    throw new AppError({
      debug: 'Image ids count mismatch on reorder',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: {
        fields: ['imageIds'],
        expectedCount: existingImageIds.length,
        receivedCount: requestedImageIds.length,
        currentImageIds: existingImageIds,
      },
    });
  }

  const missingImageIds = requestedImageIds.filter(
    (imageId) => !existingImageIds.includes(imageId),
  );

  if (missingImageIds.length > 0) {
    throw new AppError({
      debug: `Unknown image ids on reorder: ${missingImageIds.join(', ')}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: {
        fields: ['imageIds'],
        missingImageIds,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    for (const [index, imageId] of parsed.data.imageIds.entries()) {
      await updateGameImageSortOrderRecord(
        {
          imageId,
          sortOrder: index,
        },
        tx,
      );
    }

    return findGameImagesByGameIdRecord({ gameId }, tx);
  });
};
