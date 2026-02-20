// Services
import {
  getGames,
  getGameById,
  getGameImages,
  createGameWithImages,
  deleteGame,
  updateGame,
} from '../services/games.service.js';

// Utils & Config
import { AppError } from '#src/utils/errors/app-error.js';
import { logger } from '#src/core/logger.js';
import { FILE_TARGETS, cleanupUploadedFiles, cleanupTargetUrls } from '#src/modules/files/index.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';

import { z } from 'zod';

// ============================================
// ZOD Schemas (ONLY FIELDS VALIDATION)
// ============================================

const createGameSchema = z
  .object({
    title: z.string().trim().min(2, 'Game title is required'),
    description: z.string().trim().min(10, 'Game description must contain at least 10 characters'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
  })
  .strict();

const updateGameSchema = z
  .object({
    title: z.string().trim().min(1, 'Game title cannot be empty'),
    description: z.string().trim().min(1, 'Game description cannot be empty'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
  })
  .strict()
  .partial();

// ============================================
// CONTROLLERS
// ============================================

export const handleListGames = async (_, res) => {
  logger.info('GET /api/games - List games');
  const games = await getGames();

  logger.info('Games fetched', { count: games.length });
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: games,
    count: games.length,
  });
};

export const handleGetGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /api/games/${id} - Get game by id`);

  const game = await getGameById(id);

  if (!game) {
    throw new AppError({
      debug: 'Game not found',
      type: ERROR_TYPES.NOT_FOUND,
      message: ERROR_MESSAGES.GAMES_NOT_FOUND,
    });
  }

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: game,
  });
};

export const handleCreateGame = async (req, res) => {
  logger.info('POST /api/games - Create game');

  const parsed = createGameSchema.safeParse(req.body);

  if (!parsed.success) {
    cleanupUploadedFiles(req.files, {
      scope: 'games.create',
      reason: 'validation_error',
    });

    throw new AppError({
      debug: 'Not all data is available',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_VALIDATION,
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || 'body',
        message: i.message,
      })),
    });
  }

  const game = parsed.data;

  // Проверяем, что файлы загружены
  if (!req.files || req.files.length === 0) {
    throw new AppError({
      debug: 'No images uploaded',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_VALIDATION_IMAGES,
    });
  }

  // Проверяем типы файлов
  const cfg = FILE_TARGETS['game_images'];
  const invalidFiles = req.files.filter((f) => !cfg.mime.includes(f.mimetype));
  if (invalidFiles.length > 0) {
    // Удаляем загруженные файлы
    cleanupUploadedFiles(req.files, {
      scope: 'games.create',
      reason: 'mime_validation_error',
    });
    throw new AppError({
      debug: 'Invalid file type',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_INVALID_FILE_TYPE,
      details: { allowedTypes: cfg.mime, invalidFiles: invalidFiles.map((f) => f.originalname) },
    });
  }

  let gameID;
  try {
    gameID = await createGameWithImages(game, req.files, game.title);
  } catch (e) {
    cleanupUploadedFiles(req.files, {
      scope: 'games.create',
      reason: 'db_error',
    });

    throw new AppError({
      debug: `Failed to create game in DB: ${e?.message || 'unknown error'}`,
      type: ERROR_TYPES.DB,
      message: ERROR_MESSAGES.DB_UNAVAILABLE,
    });
  }

  logger.success('Game created', { gameID });
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    statusCode: HTTP_STATUS.CREATED,
  });
};

export const handleDeleteGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /api/games/${id} - Delete game`);

  const existingGame = await getGameById(id);
  if (!existingGame) {
    throw new AppError({
      debug: 'Game not found',
      type: ERROR_TYPES.NOT_FOUND,
      message: ERROR_MESSAGES.GAMES_NOT_FOUND,
    });
  }

  // Save image list before delete because DB rows are removed by cascade.
  const images = await getGameImages(id);
  await deleteGame(id);

  cleanupTargetUrls(
    images.map((img) => img.url),
    'game_images',
    {
      scope: 'games.delete',
      gameID: id,
    },
  );

  logger.success('Game deleted', { gameID: id });
  return res.status(HTTP_STATUS.NO_CONTENT).json();
};

export const handleUpdateGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`PATCH /api/games/${id} - Update game`);

  const parsed = updateGameSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Validation failed - invalid fields',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_NO_VALID_FIELDS_TO_UPDATE,
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || 'body',
        message: i.message,
      })),
    });
  }

  const gameData = parsed.data;

  // Проверяем, что есть хотя бы одно поле для обновления
  if (Object.keys(gameData).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_NO_FIELDS_TO_UPDATE,
    });
  }

  // Проверяем существование игры
  const existingGame = await getGameById(id);
  if (!existingGame) {
    throw new AppError({
      debug: 'Game not found',
      type: ERROR_TYPES.NOT_FOUND,
      message: ERROR_MESSAGES.GAMES_NOT_FOUND,
    });
  }

  await updateGame(id, gameData);

  logger.success('Game updated', { gameID: id, fields: Object.keys(gameData) });
  return res.status(HTTP_STATUS.NO_CONTENT).json();
};
