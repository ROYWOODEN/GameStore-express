import { Router } from "express";
const gameRouter = Router();

import {
  handleListGames,
  handleGetGame,
  handleCreateGame,
  handleDeleteGame,
  handleUpdateGame,
} from "../controllers/games.controller.js";

gameRouter.get("/games", handleListGames);
gameRouter.get("/games/:id", handleGetGame);
gameRouter.post("/games", handleCreateGame);
gameRouter.delete("/games/:id", handleDeleteGame);
gameRouter.patch("/games/:id", handleUpdateGame);

export { gameRouter };
