import { prisma } from '#src/core/prisma.js';

const REVIEW_INCLUDE = {
  users: {
    select: {
      id: true,
      name: true,
      avatar_url: true,
    },
  },
};

export const findReviewGameByIdRecord = async ({ gameId }, db = prisma) => {
  return db.games.findUnique({
    where: {
      id: gameId,
    },
    select: {
      id: true,
    },
  });
};

export const findActiveUserGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.user_games.findFirst({
    where: {
      user_id: userId,
      game_id: gameId,
      status: 'active',
    },
    select: {
      id: true,
    },
  });
};

export const findReviewsByGameIdRecord = async ({ gameId }, db = prisma) => {
  return db.game_reviews.findMany({
    where: {
      game_id: gameId,
    },
    include: REVIEW_INCLUDE,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });
};

export const findReviewByUserAndGameRecord = async ({ userId, gameId }, db = prisma) => {
  return db.game_reviews.findFirst({
    where: {
      user_id: userId,
      game_id: gameId,
    },
    include: REVIEW_INCLUDE,
  });
};

export const createReviewRecord = async ({ userId, gameId, rating, text }, db = prisma) => {
  return db.game_reviews.create({
    data: {
      user_id: userId,
      game_id: gameId,
      rating,
      text,
    },
    include: REVIEW_INCLUDE,
  });
};

export const updateReviewByIdRecord = async ({ reviewId, data }, db = prisma) => {
  return db.game_reviews.update({
    where: {
      id: reviewId,
    },
    data: {
      ...data,
      updated_at: new Date(),
    },
    include: REVIEW_INCLUDE,
  });
};

export const deleteReviewByIdRecord = async ({ reviewId }, db = prisma) => {
  return db.game_reviews.delete({
    where: {
      id: reviewId,
    },
  });
};
