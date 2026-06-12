import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  addCurrentUserFavorite,
  listCurrentUserFavoriteIds,
  listCurrentUserFavorites,
  removeCurrentUserFavorite,
} from '../services/favorites.service.js';

export const handleListCurrentUserFavorites = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/favorites - List current user favorites', {
    userId: String(userId),
  });

  const favorites = await listCurrentUserFavorites(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: favorites,
    meta: {
      count: favorites.length,
    },
  });
};

export const handleListCurrentUserFavoriteIds = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/favorites/ids - List current user favorite ids', {
    userId: String(userId),
  });

  const favoriteIds = await listCurrentUserFavoriteIds(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: favoriteIds,
    meta: {
      count: favoriteIds.length,
    },
  });
};

export const handleAddCurrentUserFavorite = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`POST /api/favorites/${gameId} - Add current user favorite`, {
    userId: String(userId),
  });

  const favoriteGame = await addCurrentUserFavorite({
    userId,
    gameId,
  });

  logger.success('Favorite added', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: favoriteGame,
  });
};

export const handleDeleteCurrentUserFavorite = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`DELETE /api/favorites/${gameId} - Delete current user favorite`, {
    userId: String(userId),
  });

  await removeCurrentUserFavorite({
    userId,
    gameId,
  });

  logger.success('Favorite deleted', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
