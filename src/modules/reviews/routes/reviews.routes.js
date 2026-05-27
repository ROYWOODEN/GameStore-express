import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleCreateCurrentUserReview,
  handleDeleteCurrentUserReview,
  handleGetCurrentUserGameReview,
  handleListGameReviews,
  handleUpdateCurrentUserReview,
} from '../controllers/reviews.controller.js';

const reviewsRouter = Router();

reviewsRouter.get('/games/:gameId/reviews', handleListGameReviews);
reviewsRouter.get('/games/:gameId/reviews/me', ...authorize(), handleGetCurrentUserGameReview);
reviewsRouter.post('/games/:gameId/reviews', ...authorize(), handleCreateCurrentUserReview);
reviewsRouter.patch('/games/:gameId/reviews/me', ...authorize(), handleUpdateCurrentUserReview);
reviewsRouter.delete('/games/:gameId/reviews/me', ...authorize(), handleDeleteCurrentUserReview);

export { reviewsRouter };
