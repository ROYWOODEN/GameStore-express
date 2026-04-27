import { logger } from '#src/core/logger.js';
import {
  errorHandler as handleError,
  normalizeToAppError,
} from '#src/utils/errors/error-handler.js';

export const errorHandler = (err, req, res, next) => {
  const appError = normalizeToAppError(err);

  logger.error('Request error:', {
    method: req.method,
    url: req.url,
    raw: {
      name: err?.name ?? 'UnknownError',
      message: err?.message ?? 'Unexpected error',
      code: err?.code ?? null,
      statusCode: err?.statusCode ?? null,
      details: err?.details ?? null,
      expiredAt: err?.expiredAt ?? null,
      stack: err?.stack ?? null,
    },
    normalized: {
      debug: appError.debug,
      statusCode: appError.statusCode,
      type: appError.type,
      message: appError.message,
      details: appError.details ?? null,
    },
  });

  handleError(res, appError);
};
