import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { listCatalogGenres } from '../services/catalog.service.js';

export const handleListCatalogGenres = async (_, res) => {
  logger.info('GET /api/catalog/genres - List catalog genres');

  const genres = await listCatalogGenres();

  return res.status(HTTP_STATUS.OK).json({
    data: genres,
  });
};
