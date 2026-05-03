import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  addCurrentUserBasketItem,
  clearCurrentUserBasket,
  listCurrentUserBasket,
  listCurrentUserBasketIds,
  removeCurrentUserBasketItem,
} from '../services/basket.service.js';

export const handleListCurrentUserBasket = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/basket - List current user basket', {
    userId: String(userId),
  });

  const basket = await listCurrentUserBasket(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: basket.items,
    meta: {
      count: basket.items.length,
      totalAmount: basket.totalAmount,
    },
  });
};

export const handleListCurrentUserBasketIds = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/basket/ids - List current user basket ids', {
    userId: String(userId),
  });

  const basketIds = await listCurrentUserBasketIds(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: basketIds,
    meta: {
      count: basketIds.length,
    },
  });
};

export const handleAddCurrentUserBasketItem = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`POST /api/basket/${gameId} - Add current user basket item`, {
    userId: String(userId),
  });

  await addCurrentUserBasketItem({
    userId,
    gameId,
  });

  logger.success('Basket item added', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
  });
};

export const handleDeleteCurrentUserBasketItem = async (req, res) => {
  const userId = req.auth.userId;
  const { gameId } = req.params;

  logger.info(`DELETE /api/basket/${gameId} - Delete current user basket item`, {
    userId: String(userId),
  });

  await removeCurrentUserBasketItem({
    userId,
    gameId,
  });

  logger.success('Basket item deleted', {
    userId: String(userId),
    gameId,
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export const handleClearCurrentUserBasket = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('DELETE /api/basket - Clear current user basket', {
    userId: String(userId),
  });

  const deletedCount = await clearCurrentUserBasket(userId);

  logger.success('Basket cleared', {
    userId: String(userId),
    deletedCount,
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
