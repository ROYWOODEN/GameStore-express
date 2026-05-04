import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { createCheckoutPayment, processYooKassaWebhook } from '../services/payments.service.js';

export const handleCreateCheckoutPayment = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('POST /api/payments/checkout - Create checkout payment', {
    userId: String(userId),
  });

  const payment = await createCheckoutPayment({
    userId,
    body: req.body,
  });

  logger.success('Checkout payment created', {
    userId: String(userId),
    orderId: String(payment.orderId),
    paymentId: String(payment.paymentId),
  });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: payment,
  });
};

export const handleYooKassaWebhook = async (req, res) => {
  logger.info('POST /api/payments/webhooks/yookassa - Process YooKassa webhook');

  await processYooKassaWebhook({
    payload: req.body,
    ip: req.ip,
  });

  return res.status(HTTP_STATUS.OK).send();
};
