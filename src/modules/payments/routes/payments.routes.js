import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleCreateCheckoutPayment,
  handleYooKassaWebhook,
} from '../controllers/payments.controller.js';

const paymentsRouter = Router();

paymentsRouter.post('/payments/checkout', ...authorize(), handleCreateCheckoutPayment);
paymentsRouter.post('/payments/webhooks/yookassa', handleYooKassaWebhook);

export { paymentsRouter };
