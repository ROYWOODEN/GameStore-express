import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleGetCurrentUserOrderStatus,
  handleListCurrentUserOrders,
  handleListCurrentUserPendingOrders,
} from '../controllers/orders.controller.js';

const ordersRouter = Router();

ordersRouter.get('/orders', ...authorize(), handleListCurrentUserOrders);
ordersRouter.get('/orders/pending', ...authorize(), handleListCurrentUserPendingOrders);
ordersRouter.get('/orders/:orderId/status', ...authorize(), handleGetCurrentUserOrderStatus);

export { ordersRouter };
