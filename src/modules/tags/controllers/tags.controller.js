import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  createTag,
  getTag,
  listTags,
  listTagTypes,
  removeTag,
  updateTag,
} from '../services/tags.service.js';

export const handleListTags = async (req, res) => {
  logger.info('GET /api/tags - List tags');

  const result = await listTags(req.query);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
};

export const handleListTagTypes = async (req, res) => {
  logger.info('GET /api/tag-types - List tag types');

  const tagTypes = await listTagTypes(req.query);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: tagTypes,
    meta: {
      count: tagTypes.length,
    },
  });
};

export const handleGetTag = async (req, res) => {
  const { id } = req.params;

  logger.info(`GET /api/tags/${id} - Get tag`);

  const tag = await getTag(id);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: tag,
  });
};

export const handleCreateTag = async (req, res) => {
  logger.info('POST /api/tags - Create tag');

  const tag = await createTag(req.body);

  logger.success('Tag created', { tagId: String(tag.id) });

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: tag,
  });
};

export const handleUpdateTag = async (req, res) => {
  const { id } = req.params;

  logger.info(`PATCH /api/tags/${id} - Update tag`);

  const tag = await updateTag(id, req.body);

  logger.success('Tag updated', { tagId: id });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: tag,
  });
};

export const handleDeleteTag = async (req, res) => {
  const { id } = req.params;

  logger.info(`DELETE /api/tags/${id} - Delete tag`);

  await removeTag(id);

  logger.success('Tag deleted', { tagId: id });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
