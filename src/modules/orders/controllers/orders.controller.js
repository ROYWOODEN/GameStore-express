import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  getCurrentUserOrderStatus,
  listCurrentUserOrders,
  listCurrentUserPendingOrders,
} from '#src/modules/payments/services/payments.service.js';

export const handleListCurrentUserOrders = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/orders - List current user orders', {
    userId: String(userId),
    query: req.query,
  });

  const orders = await listCurrentUserOrders({
    userId,
    query: req.query,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: orders,
    meta: {
      count: orders.length,
    },
  });
};

export const handleListCurrentUserPendingOrders = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/orders/pending - List current user pending orders', {
    userId: String(userId),
    query: req.query,
  });

  const orders = await listCurrentUserPendingOrders({
    userId,
    query: req.query,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: orders,
    meta: {
      count: orders.length,
    },
  });
};

export const handleGetCurrentUserOrderStatus = async (req, res) => {
  const userId = req.auth.userId;
  const { orderId } = req.params;

  logger.info(`GET /api/orders/${orderId}/status - Get current user order status`, {
    userId: String(userId),
  });

  const order = await getCurrentUserOrderStatus({
    userId,
    orderId,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: order,
  });
};
