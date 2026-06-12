import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  createCurrentUserReview,
  getCurrentUserGameReview,
  listGameReviews,
  removeCurrentUserReview,
  updateCurrentUserReview,
} from '../services/reviews.service.js';

export const handleListGameReviews = async (req, res) => {
  const { gameId } = req.params;

  logger.info(`GET /api/games/${gameId}/reviews - List game reviews`);

  const reviews = await listGameReviews({ gameId });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: reviews,
    meta: {
      count: reviews.length,
    },
  });
};

export const handleGetCurrentUserGameReview = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`GET /api/games/${gameId}/reviews/me - Get current user game review`, {
    userId: String(userId),
  });

  const review = await getCurrentUserGameReview({
    userId,
    gameId,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: review,
  });
};

export const handleCreateCurrentUserReview = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`POST /api/games/${gameId}/reviews - Create current user review`, {
    userId: String(userId),
  });

  const review = await createCurrentUserReview({
    userId,
    gameId,
    body: req.body,
  });

  logger.success('Review created', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: review,
  });
};

export const handleUpdateCurrentUserReview = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`PATCH /api/games/${gameId}/reviews/me - Update current user review`, {
    userId: String(userId),
  });

  const review = await updateCurrentUserReview({
    userId,
    gameId,
    body: req.body,
  });

  logger.success('Review updated', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: review,
  });
};

export const handleDeleteCurrentUserReview = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`DELETE /api/games/${gameId}/reviews/me - Delete current user review`, {
    userId: String(userId),
  });

  await removeCurrentUserReview({
    userId,
    gameId,
  });

  logger.success('Review deleted', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
