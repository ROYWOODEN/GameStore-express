import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { formatReview } from '../mappers/review.mapper.js';
import {
  createReviewRecord,
  deleteReviewByIdRecord,
  findActiveUserGameRecord,
  findReviewByUserAndGameRecord,
  findReviewGameByIdRecord,
  findReviewsByGameIdRecord,
  updateReviewByIdRecord,
} from '../repositories/reviews.repository.js';
import { createReviewSchema, updateReviewSchema } from '../validators/reviews.schemas.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const buildReviewNotFoundError = () =>
  new AppError({
    debug: 'Review not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'review' },
  });

const parseReviewEntityId = (value, field) => {
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

const validateReviewCreatePayload = (body) => {
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid review payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  return parsed.data;
};

const validateReviewUpdatePayload = (body) => {
  const parsed = updateReviewSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid review update payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  if (Object.keys(parsed.data).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
      details: { resource: 'review' },
    });
  }

  return parsed.data;
};

const ensureGameExists = async (gameId) => {
  const game = await findReviewGameByIdRecord({ gameId });

  if (!game) {
    throw buildGameNotFoundError();
  }

  return game;
};

const ensureCanCreateReview = async ({ userId, gameId }) => {
  const userGame = await findActiveUserGameRecord({
    userId,
    gameId,
  });

  if (!userGame) {
    throw new AppError({
      debug: `User ${userId} does not own game ${gameId}`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.REVIEW_GAME_NOT_OWNED,
      statusCode: HTTP_STATUS.FORBIDDEN,
      details: {
        fields: ['gameId'],
      },
    });
  }
};

const buildReviewAlreadyExistsError = ({ userId, gameId }) =>
  new AppError({
    debug: `Review already exists for user ${userId} and game ${gameId}`,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.REVIEW_ALREADY_EXISTS,
    statusCode: HTTP_STATUS.CONFLICT,
    details: {
      fields: ['gameId'],
    },
  });

const throwReviewConflictIfNeeded = (error, { userId, gameId }) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return;
  }

  throw buildReviewAlreadyExistsError({ userId, gameId });
};

export const listGameReviews = async ({ gameId: rawGameId }) => {
  const gameId = parseReviewEntityId(rawGameId, 'gameId');

  await ensureGameExists(gameId);

  const reviews = await findReviewsByGameIdRecord({ gameId });
  return reviews.map(formatReview);
};

export const getCurrentUserGameReview = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseReviewEntityId(rawGameId, 'gameId');

  await ensureGameExists(gameId);

  const review = await findReviewByUserAndGameRecord({
    userId,
    gameId,
  });

  if (!review) {
    return null;
  }

  return formatReview(review);
};

export const createCurrentUserReview = async ({ userId, gameId: rawGameId, body }) => {
  const gameId = parseReviewEntityId(rawGameId, 'gameId');
  const reviewData = validateReviewCreatePayload(body);

  await ensureGameExists(gameId);
  await ensureCanCreateReview({
    userId,
    gameId,
  });

  const existingReview = await findReviewByUserAndGameRecord({
    userId,
    gameId,
  });

  if (existingReview) {
    throw buildReviewAlreadyExistsError({ userId, gameId });
  }

  try {
    const review = await createReviewRecord({
      userId,
      gameId,
      rating: reviewData.rating,
      text: reviewData.text,
    });

    return formatReview(review);
  } catch (error) {
    throwReviewConflictIfNeeded(error, { userId, gameId });
    throw error;
  }
};

export const updateCurrentUserReview = async ({ userId, gameId: rawGameId, body }) => {
  const gameId = parseReviewEntityId(rawGameId, 'gameId');
  const reviewData = validateReviewUpdatePayload(body);

  await ensureGameExists(gameId);

  const existingReview = await findReviewByUserAndGameRecord({
    userId,
    gameId,
  });

  if (!existingReview) {
    throw buildReviewNotFoundError();
  }

  const review = await updateReviewByIdRecord({
    reviewId: existingReview.id,
    data: reviewData,
  });

  return formatReview(review);
};

export const removeCurrentUserReview = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseReviewEntityId(rawGameId, 'gameId');

  await ensureGameExists(gameId);

  const existingReview = await findReviewByUserAndGameRecord({
    userId,
    gameId,
  });

  if (!existingReview) {
    throw buildReviewNotFoundError();
  }

  await deleteReviewByIdRecord({
    reviewId: existingReview.id,
  });
};
