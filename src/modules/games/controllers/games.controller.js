import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  createGame,
  getGame,
  listGames,
  patchGame,
  removeGame,
} from '../services/games.service.js';

export const handleListGames = async (_, res) => {
  logger.info('GET /api/games - List games');
  const games = await listGames();

  logger.info('Games fetched', { count: games.length });
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: games,
    meta: {
      count: games.length,
    },
  });
};

export const handleGetGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /api/games/${id} - Get game by id`);

  const game = await getGame(id);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: game,
  });
};

export const handleCreateGame = async (req, res) => {
  logger.info('POST /api/games - Create game');

  const gameID = await createGame({
    body: req.body,
    files: req.files,
  });

  logger.success('Game created', { gameID });
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
  });
};

export const handleDeleteGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /api/games/${id} - Delete game`);

  await removeGame(id);

  logger.success('Game deleted', { gameID: id });
  return res.status(HTTP_STATUS.NO_CONTENT).json();
};

export const handleUpdateGame = async (req, res) => {
  const { id } = req.params;
  logger.info(`PATCH /api/games/${id} - Update game`);

  const gameData = await patchGame(id, req.body);

  logger.success('Game updated', { gameID: id, fields: Object.keys(gameData) });
  return res.status(HTTP_STATUS.NO_CONTENT).json();
};
