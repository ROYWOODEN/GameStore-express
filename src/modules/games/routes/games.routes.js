import { Router } from 'express';
const gamesRouter = Router();

import {
  handleListGames,
  handleGetGame,
  handleCreateGame,
  handleDeleteGame,
  handleUpdateGame,
} from '#src/modules/games/controllers/games.controller.js';
import { withUpload } from '#src/middleware/upload/with-upload.middleware.js';

gamesRouter.get('/games', handleListGames);
gamesRouter.get('/games/:id', handleGetGame);
gamesRouter.post(
  '/games',
  withUpload({ type: 'game_images', field: 'images', maxCount: 10 }),
  handleCreateGame,
);
gamesRouter.delete('/games/:id', handleDeleteGame);
gamesRouter.patch('/games/:id', handleUpdateGame);

export { gamesRouter };
