import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { cleanupTargetUrls, cleanupUploadedFiles } from '#src/modules/files/index.js';
import { formatGame, formatGameList } from '#src/modules/games/mappers/game.mappers.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { Prisma } from '@prisma/client';
import {
  createGameWithImagesRecord,
  deleteGameById,
  findGameById,
  findGameImagesByGameId,
  findManyGames,
  updateGameById,
} from '../repositories/games.repository.js';
import { createGameSchema, updateGameSchema } from '../validators/games.schemas.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const throwTitleConflictIfNeeded = (error) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return;
  }

  const targetFields = getPrismaTargetFields(error.meta?.target);

  if (!targetFields.includes('title')) {
    return;
  }

  throw new AppError({
    debug: error.message || 'Game title already exists',
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.GAME_TITLE_TAKEN,
    statusCode: HTTP_STATUS.CONFLICT,
    details: { fields: ['title'] },
  });
};

const validateCreateFiles = (files) => {
  if (!files || files.length === 0) {
    throw new AppError({
      debug: 'No images uploaded',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.FILES_REQUIRED,
      details: { resource: 'game', field: 'images' },
    });
  }
};

export const listGames = async () => {
  const games = await findManyGames();
  return games.map(formatGameList);
};

export const getGame = async (id) => {
  const game = await findGameById(id);

  if (!game) {
    throw buildGameNotFoundError();
  }

  return formatGame(game);
};

export const createGame = async ({ body, files }) => {
  const parsed = createGameSchema.safeParse(body);

  if (!parsed.success) {
    cleanupUploadedFiles(files, {
      scope: 'games.create',
      reason: 'validation_error',
    });

    throw new AppError({
      debug: 'Not all data is available',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  validateCreateFiles(files);

  try {
    return await createGameWithImagesRecord(parsed.data, files);
  } catch (error) {
    cleanupUploadedFiles(files, {
      scope: 'games.create',
      reason: 'db_error',
    });

    throwTitleConflictIfNeeded(error);

    throw new AppError({
      debug: `Failed to create game in DB: ${error?.message || 'unknown error'}`,
      type: ERROR_TYPES.DB,
      message: ERROR_MESSAGES.DB_UNAVAILABLE,
    });
  }
};

export const removeGame = async (id) => {
  const game = await findGameById(id);

  if (!game) {
    throw buildGameNotFoundError();
  }

  const images = await findGameImagesByGameId(id);
  await deleteGameById(id);

  cleanupTargetUrls(
    images.map((image) => image.url),
    'game_images',
    {
      scope: 'games.delete',
      gameID: id,
    },
  );

  return game;
};

export const patchGame = async (id, body) => {
  const parsed = updateGameSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Validation failed - invalid fields',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_VALID_FIELDS_TO_UPDATE,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const gameData = parsed.data;

  if (Object.keys(gameData).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
      details: { resource: 'game' },
    });
  }

  const game = await findGameById(id);

  if (!game) {
    throw buildGameNotFoundError();
  }

  try {
    await updateGameById(id, gameData);
  } catch (error) {
    throwTitleConflictIfNeeded(error);
    throw error;
  }

  return gameData;
};
