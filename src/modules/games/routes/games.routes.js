import { Router } from 'express';
import { asyncHandler } from '#src/middleware/error.middleware.js';
const gameRouter = Router();

import {
  handleListGames,
  handleGetGame,
  handleCreateGame,
  handleDeleteGame,
  handleUpdateGame,
} from '#src/modules/games/controllers/games.controller.js';
import { withUpload } from '#src/middleware/upload/with.upload.middleware.js';

gameRouter.get('/games', asyncHandler(handleListGames));
gameRouter.get('/games/:id', asyncHandler(handleGetGame));
gameRouter.post(
  '/games',
  withUpload({ type: 'game_images', field: 'images', maxCount: 10 }),
  asyncHandler(handleCreateGame),
);
gameRouter.delete('/games/:id', asyncHandler(handleDeleteGame));
gameRouter.patch('/games/:id', asyncHandler(handleUpdateGame));

export { gameRouter };
