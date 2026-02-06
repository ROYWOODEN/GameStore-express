import {
  getGames,
  getGameById,
  createGame,
  createGameImages,
  deleteGame,
  updateGame,
} from '../services/games.service.js';
import { AppError } from '#src/utils/AppError.js';
import { FILE_TARGETS } from '#src/modules/files/config/files.config.js';
import { logger } from '#src/core/logger.js';
import fs from 'fs';

export const handleListGames = async (req, res) => {
  logger.info('GET /api/games - List games');
  const games = await getGames();

  logger.info('Games fetched', { count: games.length });
  return res.status(200).json({
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
      type: 'NotFoundError',
      message: 'error.games.not_found',
      statusCode: 404,
    });
  }

  return res.status(200).json({
    success: true,
    data: game,
  });
};

export const handleCreateGame = async (req, res) => {
  logger.info('POST /api/games - Create game');

  const game = {
    title: req.body.title,
    description: req.body.description,
    price: Number(req.body.price),
  };

  if (!game.title || !game.description || !game.price) {
    // если файлы уже были загружены — удаляем их, чтобы не оставлять мусор
    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        try {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        } catch (e) {
          logger.warn('Failed to remove uploaded file after validation error', {
            file: f.path,
            err: e,
          });
        }
      });
    }
    throw new AppError({
      debug: 'Not all data is available',
      type: 'ValidationError',
      message: 'error.games.validation',
    });
  }

  // Проверяем, что файлы загружены
  if (!req.files || req.files.length === 0) {
    throw new AppError({
      debug: 'No images uploaded',
      type: 'ValidationError',
      message: 'error.games.validation_images',
    });
  }

  // Проверяем типы файлов
  const cfg = FILE_TARGETS['game_images'];
  const invalidFiles = req.files.filter((f) => !cfg.mime.includes(f.mimetype));
  if (invalidFiles.length > 0) {
    // Удаляем загруженные файлы
    req.files.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    throw new AppError({
      debug: 'Invalid file type',
      type: 'ValidationError',
      message: 'error.games.invalid_file_type',
      details: { allowedTypes: cfg.mime, invalidFiles: invalidFiles.map((f) => f.originalname) },
    });
  }

  const gameID = await createGame(game);
  await createGameImages(gameID, req.files, game.title);

  logger.success('Game created', { gameID });
  return res.status(201).json({
    success: true,
    statusCode: 201,
  });
};

export const handleDeleteGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /api/games/${id} - Delete game`);

  const existingGame = await getGameById(id);
  if (!existingGame) {
    throw new AppError({
      debug: 'Game not found',
      type: 'NotFoundError',
      message: 'error.games.not_found',
      statusCode: 404,
    });
  }

  await deleteGame(id);
  logger.success('Game deleted', { gameID: id });
  return res.status(204).json();
};

export const handleUpdateGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`PATCH /api/games/${id} - Update game`);

  const { ...game } = req.body || {};

  let updated = {};
  if (Object.keys(game).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: 'ValidationError',
      message: 'error.games.no_fields_to_update',
      statusCode: 400,
      details: { receivedFields: Object.keys(game) },
    });
  }

  const existingGame = await getGameById(id);
  if (!existingGame) {
    throw new AppError({
      debug: 'Game not found',
      type: 'NotFoundError',
      message: 'error.games.not_found',
      statusCode: 404,
    });
  }

  if (typeof game.title === 'string' && game.title.trim() !== '') {
    updated.title = game.title.trim();
  }
  if (typeof game.description === 'string' && game.description.trim() !== '') {
    updated.description = game.description.trim();
  }
  const price = Number(game.price);
  if (
    price != null &&
    String(price).trim() !== '' &&
    !Number.isNaN(price) &&
    price >= 0 &&
    Number.isFinite(price)
  ) {
    updated.price = price;
  }

  if (Object.keys(updated).length === 0) {
    throw new AppError({
      debug: 'No valid fields to update',
      type: 'ValidationError',
      message: 'error.games.no_valid_fields_to_update',
      statusCode: 400,
    });
  }

  await updateGame(id, updated);

  logger.success('Game updated', { gameID: id, fields: Object.keys(updated) });
  return res.status(204).json();
};
