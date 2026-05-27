import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleListCurrentUserLibrary,
  handleListCurrentUserLibraryGameIds,
} from '../controllers/library.controller.js';

const libraryRouter = Router();

libraryRouter.get('/library', ...authorize(), handleListCurrentUserLibrary);
libraryRouter.get('/library/ids', ...authorize(), handleListCurrentUserLibraryGameIds);

export { libraryRouter };
