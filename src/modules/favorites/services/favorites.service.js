import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { formatGameList } from '#src/modules/games/mappers/game.mappers.js';
import { attachGameRatingSummaries } from '#src/modules/games/repositories/games.repository.js';
import { AppError } from '#src/utils/errors/app-error.js';
import {
  createFavoriteRecord,
  deleteFavoriteByUserAndGameRecord,
  findFavoriteByUserAndGameRecord,
  findFavoriteGameByIdRecord,
  findFavoriteGameIdsByUserIdRecord,
  findFavoritesByUserIdRecord,
} from '../repositories/favorites.repository.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const buildFavoriteNotFoundError = () =>
  new AppError({
    debug: 'Favorite not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'favorite' },
  });

const parseFavoriteEntityId = (value, field) => {
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

export const listCurrentUserFavorites = async (userId) => {
  const favoriteRows = await findFavoritesByUserIdRecord({ userId });
  const uniqueGames = [];
  const seenGameIds = new Set();

  for (const favoriteRow of favoriteRows) {
    if (!favoriteRow.games) {
      continue;
    }

    const gameId = String(favoriteRow.games.id);

    if (seenGameIds.has(gameId)) {
      continue;
    }

    seenGameIds.add(gameId);
    uniqueGames.push(favoriteRow.games);
  }

  const gamesWithRating = await attachGameRatingSummaries(uniqueGames);
  return gamesWithRating.map(formatGameList);
};

export const listCurrentUserFavoriteIds = async (userId) => {
  const favoriteRows = await findFavoriteGameIdsByUserIdRecord({ userId });
  const favoriteIds = [];
  const seenGameIds = new Set();

  for (const favoriteRow of favoriteRows) {
    if (favoriteRow.game_id === null || favoriteRow.game_id === undefined) {
      continue;
    }

    const gameId = String(favoriteRow.game_id);

    if (seenGameIds.has(gameId)) {
      continue;
    }

    seenGameIds.add(gameId);
    favoriteIds.push(favoriteRow.game_id);
  }

  return favoriteIds;
};

export const addCurrentUserFavorite = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseFavoriteEntityId(rawGameId, 'gameId');

  const game = await findFavoriteGameByIdRecord({ gameId });

  if (!game) {
    throw buildGameNotFoundError();
  }

  const existingFavorite = await findFavoriteByUserAndGameRecord({
    userId,
    gameId,
  });

  if (existingFavorite) {
    throw new AppError({
      debug: `Favorite already exists for user ${userId} and game ${gameId}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.FAVORITE_ALREADY_EXISTS,
      statusCode: HTTP_STATUS.CONFLICT,
      details: {
        fields: ['gameId'],
      },
    });
  }

  await createFavoriteRecord({
    userId,
    gameId,
  });

  const [gameWithRating] = await attachGameRatingSummaries([game]);
  return formatGameList(gameWithRating);
};

export const removeCurrentUserFavorite = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseFavoriteEntityId(rawGameId, 'gameId');

  const game = await findFavoriteGameByIdRecord({ gameId });

  if (!game) {
    throw buildGameNotFoundError();
  }

  const existingFavorite = await findFavoriteByUserAndGameRecord({
    userId,
    gameId,
  });

  if (!existingFavorite) {
    throw buildFavoriteNotFoundError();
  }

  await deleteFavoriteByUserAndGameRecord({
    userId,
    gameId,
  });
};
