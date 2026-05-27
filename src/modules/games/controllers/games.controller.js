import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  createGame,
  getGame,
  listGames,
  patchGame,
  removeGame,
  replaceGameTags,
} from '../services/games.service.js';

export const handleListGames = async (req, res) => {
  logger.info('GET /api/games - List games');
  const result = await listGames(req.query);

  logger.info('Games fetched', { count: result.meta.count, total: result.meta.total });
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result.items,
    meta: result.meta,
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

export const handleReplaceGameTags = async (req, res) => {
  const { id } = req.params;
  logger.info(`PATCH /api/games/${id}/tags - Replace game tags`);

  const game = await replaceGameTags(id, req.body);

  logger.success('Game tags replaced', { gameID: id });
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: game,
  });
};
