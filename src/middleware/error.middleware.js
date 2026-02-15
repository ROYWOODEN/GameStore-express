import { logger } from '#src/core/logger.js';
import { errorHandler as handleError } from '#src/utils/errorHandler.js';

// Обёртка которая ловит ошибки из async функций и передаёт в middleware
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Сам middleware для обработки ошибок
export const errorHandler = (err, req, res, next) => {
  logger.error('Request error:', err);
  handleError(res, err);
};
