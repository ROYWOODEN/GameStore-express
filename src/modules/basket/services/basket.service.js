import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { formatGameList } from '#src/modules/games/mappers/game.mappers.js';
import { attachGameRatingSummaries } from '#src/modules/games/repositories/games.repository.js';
import { AppError } from '#src/utils/errors/app-error.js';
import {
  createBasketRecord,
  deleteBasketByUserAndGameRecord,
  deleteBasketByUserIdRecord,
  findBasketByUserAndGameRecord,
  findBasketByUserIdRecord,
  findBasketGameByIdRecord,
  findBasketGameIdsByUserIdRecord,
} from '../repositories/basket.repository.js';

const buildGameNotFoundError = () =>
  new AppError({
    debug: 'Game not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'game' },
  });

const buildBasketItemNotFoundError = () =>
  new AppError({
    debug: 'Basket item not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'basket' },
  });

const parseBasketEntityId = (value, field) => {
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

export const listCurrentUserBasket = async (userId) => {
  const basketRows = await findBasketByUserIdRecord({ userId });
  const items = [];
  const seenGameIds = new Set();
  let totalAmount = new Prisma.Decimal(0);

  for (const basketRow of basketRows) {
    if (!basketRow.games) {
      continue;
    }

    const gameId = String(basketRow.games.id);

    if (seenGameIds.has(gameId)) {
      continue;
    }

    seenGameIds.add(gameId);
    items.push(basketRow.games);
    totalAmount = totalAmount.plus(basketRow.games.price);
  }

  const gamesWithRating = await attachGameRatingSummaries(items);

  return {
    items: gamesWithRating.map(formatGameList),
    totalAmount: totalAmount.toFixed(2),
  };
};

export const listCurrentUserBasketIds = async (userId) => {
  const basketRows = await findBasketGameIdsByUserIdRecord({ userId });
  const basketIds = [];
  const seenGameIds = new Set();

  for (const basketRow of basketRows) {
    if (basketRow.game_id === null || basketRow.game_id === undefined) {
      continue;
    }

    const gameId = String(basketRow.game_id);

    if (seenGameIds.has(gameId)) {
      continue;
    }

    seenGameIds.add(gameId);
    basketIds.push(basketRow.game_id);
  }

  return basketIds;
};

export const addCurrentUserBasketItem = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseBasketEntityId(rawGameId, 'gameId');

  const game = await findBasketGameByIdRecord({ gameId });

  if (!game) {
    throw buildGameNotFoundError();
  }

  const existingBasketItem = await findBasketByUserAndGameRecord({
    userId,
    gameId,
  });

  if (existingBasketItem) {
    throw new AppError({
      debug: `Basket item already exists for user ${userId} and game ${gameId}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.BASKET_ALREADY_EXISTS,
      statusCode: HTTP_STATUS.CONFLICT,
      details: {
        fields: ['gameId'],
      },
    });
  }

  await createBasketRecord({
    userId,
    gameId,
  });
};

export const removeCurrentUserBasketItem = async ({ userId, gameId: rawGameId }) => {
  const gameId = parseBasketEntityId(rawGameId, 'gameId');

  const existingBasketItem = await findBasketByUserAndGameRecord({
    userId,
    gameId,
  });

  if (!existingBasketItem) {
    throw buildBasketItemNotFoundError();
  }

  await deleteBasketByUserAndGameRecord({
    userId,
    gameId,
  });
};

export const clearCurrentUserBasket = async (userId) => {
  const deleted = await deleteBasketByUserIdRecord({ userId });
  return deleted.count;
};
