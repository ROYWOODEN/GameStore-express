import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  addGameImages,
  removeGameImage,
  reorderGameImages,
} from '../services/games-images.service.js';

export const handleAddGameImages = async (req, res) => {
  const { id } = req.params;

  logger.info(`POST /api/games/${id}/images - Add game images`);

  const images = await addGameImages({
    gameId: id,
    files: req.files,
  });

  logger.success('Game images added', {
    gameId: id,
    count: images.length,
  });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: images,
  });
};

export const handleDeleteGameImage = async (req, res) => {
  const { id, imageId } = req.params;

  logger.info(`DELETE /api/games/${id}/images/${imageId} - Delete game image`);

  await removeGameImage({
    gameId: id,
    imageId,
  });

  logger.success('Game image deleted', {
    gameId: id,
    imageId,
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export const handleReorderGameImages = async (req, res) => {
  const { id } = req.params;

  logger.info(`PATCH /api/games/${id}/images/order - Reorder game images`);

  const images = await reorderGameImages({
    gameId: id,
    body: req.body,
  });

  logger.success('Game images reordered', {
    gameId: id,
    count: images.length,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: images,
  });
};
