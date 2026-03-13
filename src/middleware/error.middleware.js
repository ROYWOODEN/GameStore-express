import { logger } from '#src/core/logger.js';
import { errorHandler as handleError } from '#src/utils/errors/error-handler.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Request error:', { method: req.method, url: req.url, err });
  handleError(res, err);
};
