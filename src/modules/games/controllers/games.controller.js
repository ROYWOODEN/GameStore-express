import {
  getGames,
  getGameById,
  createGame,
  deleteGame,
  updateGame,
} from "../services/games.service.js";
import { errorHandler } from "#src/utils/errorHadler.js";

export const handleListGames = async (req, res) => {
  try {
    const games = await getGames();

    return res.status(200).json({
      success: true,
      data: games,
      count: games.length,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleGetGame = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await getGameById(id);
    return res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleCreateGame = async (req, res) => {
  try {
    const { ...game } = req.body;
    await createGame(game);
    return res.status(201).json({
      success: true,
      status: 201,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};
export const handleDeleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteGame(id);
    return res.status(204).json();
  } catch (error) {
    errorHandler(res, error);
  }
};

export const handleUpdateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { ...game } = req.body;
    await updateGame(id, game);
    return res.status(204).json();
  } catch (error) {
    errorHandler(res, error);
  }
};
