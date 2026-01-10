import {
  getGames,
  getGameById,
  createGame,
  deleteGame,
  updateGame,
} from '../services/games.service.js';
import { errorHandler } from '#src/utils/errorHadler.js';
import { AppError } from '#src/utils/AppError.js';

export const handleListGames = async (req, res) => {
  try {
    const games = await getGames();

    return res.status(200).json({
      success: true,
      data: games,
      count: games.length,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleGetGame = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await getGameById(id);

    if (!game) throw new AppError('Game not found', 'NotFoundError');

    return res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleCreateGame = async (req, res) => {
  try {
    const { ...game } = req.body;

    if (!game.title || !game.description || !game.price) {
      throw new AppError('Not all data is available', 'ValidationError');
    }

    await createGame(game);
    return res.status(201).json({
      success: true,
      statusCode: 201,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};
export const handleDeleteGame = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGame = await getGameById(id);
    if (!existingGame) throw new AppError('Game not found', 'NotFoundError');

    await deleteGame(id);
    return res.status(204).json();
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleUpdateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { ...game } = req.body;
    let updated = {};
    if (Object.keys(game).length === 0)
      throw new AppError('No fields to update', 'ValidationError');

    const existingGame = await getGameById(id);
    if (!existingGame) throw new AppError('Game not fount', 'NotFoundError');

    if (game.title !== undefined && game.title.trim() !== '') {
      updated.title = game.title.trim();
    }
    if (game.description !== undefined && game.description.trim() !== '')
      updated.description = game.description.trim();
    if (game.price !== undefined && game.price !== '') updated.price = game.price;

    if (Object.keys(updated).length === 0) {
      throw new AppError('Game not fount', 'NotFoundError');
    }

    await updateGame(id, updated);

    return res.status(204).json();
  } catch (error) {
    errorHandler(res, error);
  }
};
