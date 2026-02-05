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
    throw new AppError('Game not found', 'NotFoundError', 'Ресурс не найден', 404);
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
    throw new AppError('Not all data is available', 'ValidationError', 'Не все данные указаны');
  }

  // Проверяем, что файлы загружены
  if (!req.files || req.files.length === 0) {
    throw new AppError('No images uploaded', 'ValidationError', 'Изображения не загружены');
  }

  // Проверяем типы файлов
  const cfg = FILE_TARGETS['game_images'];
  const invalidFiles = req.files.filter((f) => !cfg.mime.includes(f.mimetype));
  if (invalidFiles.length > 0) {
    // Удаляем загруженные файлы
    req.files.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    throw new AppError('Invalid file type', 'ValidationError', 'Недопустимый тип файла');
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
    throw new AppError('Game not found', 'NotFoundError', 'Игра не найдена', 404);
  }

  await deleteGame(id);
  logger.success('Game deleted', { gameID: id });
  return res.status(204).json();
};

export const handleUpdateGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`PATCH /api/games/${id} - Update game`);

  const { ...game } = req.body;
  let updated = {};
  if (Object.keys(game).length === 0) {
    throw new AppError('No fields to update', 'ValidationError', 'Нечего обновлять', 400);
  }

  const existingGame = await getGameById(id);
  if (!existingGame) {
    throw new AppError('Game not found', 'NotFoundError', 'Игра не найдена', 404);
  }

  if (game.title !== undefined && game.title.trim() !== '') {
    updated.title = game.title.trim();
  }
  if (game.description !== undefined && game.description.trim() !== '')
    updated.description = game.description.trim();
  if (game.price !== undefined && game.price !== '') updated.price = game.price;

  if (Object.keys(updated).length === 0) {
    throw new AppError('No valid fields to update', 'ValidationError', 'Нет валидных полей', 400);
  }

  await updateGame(id, updated);

  logger.success('Game updated', { gameID: id, fields: Object.keys(updated) });
  return res.status(204).json();
};
