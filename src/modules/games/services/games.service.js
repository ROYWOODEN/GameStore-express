import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { cleanupTargetUrls, cleanupUploadedFiles } from '#src/modules/files/index.js';
import { formatGame, formatGameList } from '#src/modules/games/mappers/game.mappers.js';
import { resolveGameTagSelection } from '#src/modules/tags/services/tags.service.js';
import { gameTagsPayloadSchema } from '#src/modules/tags/validators/tags.schemas.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { buildPaginationMeta } from '#src/utils/pagination/pagination.js';
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
import {
  createGameSchema,
  listGamesQuerySchema,
  updateGameSchema,
} from '../validators/games.schemas.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const parseGameEntityId = (value, field = 'gameId') => {
  try {
    const id = BigInt(value);

    if (id <= 0n) {
      throw new Error('Id must be positive');
    }

    return id;
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

const normalizeTagIdsBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'tagIds[]')) {
    return body;
  }

  const normalized = { ...body };

  if (!Object.prototype.hasOwnProperty.call(normalized, 'tagIds')) {
    normalized.tagIds = normalized['tagIds[]'];
  }

  delete normalized['tagIds[]'];
  return normalized;
};

export const listGames = async (query = {}) => {
  const parsed = listGamesQuerySchema.safeParse(normalizeTagIdsBody(query));

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid games query',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const { items, total } = await findManyGames(parsed.data);

  return {
    items: items.map(formatGameList),
    meta: buildPaginationMeta({
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
      count: items.length,
    }),
  };
};

export const getGame = async (id) => {
  const gameId = parseGameEntityId(id);
  const game = await findGameById(gameId);

  if (!game) {
    throw buildGameNotFoundError();
  }

  return formatGame(game);
};

export const createGame = async ({ body, files }) => {
  const parsed = createGameSchema.safeParse(normalizeTagIdsBody(body));

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
    await resolveGameTagSelection(parsed.data.tagIds);
    return await createGameWithImagesRecord(parsed.data, files);
  } catch (error) {
    cleanupUploadedFiles(files, {
      scope: 'games.create',
      reason: 'db_error',
    });

    throwTitleConflictIfNeeded(error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      debug: `Failed to create game in DB: ${error?.message || 'unknown error'}`,
      type: ERROR_TYPES.DB,
      message: ERROR_MESSAGES.DB_UNAVAILABLE,
    });
  }
};

export const removeGame = async (id) => {
  const gameId = parseGameEntityId(id);
  const game = await findGameById(gameId);

  if (!game) {
    throw buildGameNotFoundError();
  }

  const images = await findGameImagesByGameId(gameId);
  await deleteGameById(gameId);

  cleanupTargetUrls(
    images.map((image) => image.url),
    'game_images',
    {
      scope: 'games.delete',
      gameID: String(gameId),
    },
  );

  return game;
};

export const patchGame = async (id, body) => {
  const gameId = parseGameEntityId(id);
  const parsed = updateGameSchema.safeParse(normalizeTagIdsBody(body));

  if (!parsed.success) {
    throw new AppError({
      debug: 'Validation failed - invalid fields',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_VALID_FIELDS_TO_UPDATE,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const { tagIds, ...gameData } = parsed.data;

  if (Object.keys(gameData).length === 0 && tagIds === undefined) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
      details: { resource: 'game' },
    });
  }

  const game = await findGameById(gameId);

  if (!game) {
    throw buildGameNotFoundError();
  }

  if (tagIds !== undefined) {
    await resolveGameTagSelection(tagIds);
  }

  try {
    await updateGameById(gameId, gameData, { tagIds });
  } catch (error) {
    throwTitleConflictIfNeeded(error);
    throw error;
  }

  return {
    ...gameData,
    ...(tagIds !== undefined ? { tagIds } : {}),
  };
};

export const replaceGameTags = async (id, body) => {
  const gameId = parseGameEntityId(id);
  const parsed = gameTagsPayloadSchema.safeParse(normalizeTagIdsBody(body));

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid game tags payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const game = await findGameById(gameId);

  if (!game) {
    throw buildGameNotFoundError();
  }

  await resolveGameTagSelection(parsed.data.tagIds);
  await updateGameById(gameId, {}, { tagIds: parsed.data.tagIds });

  return getGame(gameId);
};
