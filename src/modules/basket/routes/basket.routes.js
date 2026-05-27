import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleAddCurrentUserBasketItem,
  handleClearCurrentUserBasket,
  handleDeleteCurrentUserBasketItem,
  handleListCurrentUserBasket,
  handleListCurrentUserBasketIds,
} from '../controllers/basket.controller.js';

const basketRouter = Router();

basketRouter.get('/basket', ...authorize(), handleListCurrentUserBasket);
basketRouter.get('/basket/ids', ...authorize(), handleListCurrentUserBasketIds);
basketRouter.post('/basket/:gameId', ...authorize(), handleAddCurrentUserBasketItem);
basketRouter.delete('/basket/:gameId', ...authorize(), handleDeleteCurrentUserBasketItem);
basketRouter.delete('/basket', ...authorize(), handleClearCurrentUserBasket);

export { basketRouter };
