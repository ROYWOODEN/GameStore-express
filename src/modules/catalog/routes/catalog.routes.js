import { Router } from 'express';
import { handleListCatalogGenres } from '../controllers/catalog.controller.js';

const catalogRouter = Router();

catalogRouter.get('/catalog/genres', handleListCatalogGenres);

export { catalogRouter };
