import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleAddCurrentUserFavorite,
  handleDeleteCurrentUserFavorite,
  handleListCurrentUserFavoriteIds,
  handleListCurrentUserFavorites,
} from '../controllers/favorites.controller.js';

const favoritesRouter = Router();

favoritesRouter.get('/favorites', ...authorize(), handleListCurrentUserFavorites);
favoritesRouter.get('/favorites/ids', ...authorize(), handleListCurrentUserFavoriteIds);
favoritesRouter.post('/favorites/:gameId', ...authorize(), handleAddCurrentUserFavorite);
favoritesRouter.delete('/favorites/:gameId', ...authorize(), handleDeleteCurrentUserFavorite);

export { favoritesRouter };
