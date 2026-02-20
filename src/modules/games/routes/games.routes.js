import { Router } from 'express';
import { asyncHandler } from '#src/middleware/error.middleware.js';
const gamesRouter = Router();

import {
  handleListGames,
  handleGetGame,
  handleCreateGame,
  handleDeleteGame,
  handleUpdateGame,
} from '#src/modules/games/controllers/games.controller.js';
import { withUpload } from '#src/middleware/upload/with-upload.middleware.js';

gamesRouter.get('/games', asyncHandler(handleListGames));
gamesRouter.get('/games/:id', asyncHandler(handleGetGame));
gamesRouter.post(
  '/games',
  withUpload({ type: 'game_images', field: 'images', maxCount: 10 }),
  asyncHandler(handleCreateGame),
);
gamesRouter.delete('/games/:id', asyncHandler(handleDeleteGame));
gamesRouter.patch('/games/:id', asyncHandler(handleUpdateGame));

export { gamesRouter };
