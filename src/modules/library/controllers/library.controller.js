import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import {
  listCurrentUserLibrary,
  listCurrentUserLibraryGameIds,
} from '#src/modules/payments/services/payments.service.js';

export const handleListCurrentUserLibrary = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/library - List current user library', {
    userId: String(userId),
  });

  const library = await listCurrentUserLibrary(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: library,
    meta: {
      count: library.length,
    },
  });
};

export const handleListCurrentUserLibraryGameIds = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/library/ids - List current user library ids', {
    userId: String(userId),
  });

  const libraryIds = await listCurrentUserLibraryGameIds(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: libraryIds,
    meta: {
      count: libraryIds.length,
    },
  });
};
