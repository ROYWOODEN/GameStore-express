import { HTTP_STATUS, STATUS_TEXT, ERROR_TYPES } from '#src/constants/http-statuses.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';

const normalizeToAppError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.name === 'JsonWebTokenError' || error?.name === 'UnauthorizedError') {
    return new AppError({
      debug: error?.message || 'Unauthorized',
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
      statusCode: error?.statusCode ?? null,
    });
  }

  if (error?.name === 'TokenExpiredError') {
    return new AppError({
      debug: error?.message || 'Token expired',
      type: ERROR_TYPES.AUTH_EXPIRED,
      message: ERROR_MESSAGES.AUTH_EXPIRED,
      statusCode: error?.statusCode ?? null,
    });
  }

  if (error?.name === 'PrismaClientKnownRequestError') {
    const targetFields = getPrismaTargetFields(error?.meta?.target);

    if (error.code === 'P2002') {
      return new AppError({
        debug: error?.message || 'Unique constraint failed',
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: HTTP_STATUS.CONFLICT,
        details: targetFields.length > 0 ? { fields: targetFields } : null,
      });
    }

    return new AppError({
      debug: error?.message || 'Database unavailable',
      type: ERROR_TYPES.DB,
      message: ERROR_MESSAGES.DB_UNAVAILABLE,
      statusCode: error?.statusCode ?? null,
    });
  }

  return new AppError({
    debug: error?.message || 'Unexpected error',
    type: ERROR_TYPES.INTERNAL,
    message: ERROR_MESSAGES.INTERNAL,
    statusCode: error?.statusCode ?? null,
  });
};

export function errorHandler(res, error) {
  const appError = normalizeToAppError(error);
  const status = appError.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;

  return res.status(status).json({
    success: false,
    error: {
      statusCode: status,
      statusText: STATUS_TEXT[status] || STATUS_TEXT[HTTP_STATUS.INTERNAL_SERVER_ERROR],
      type: appError.type,
      message: appError.message,
      details: appError.details ?? null,
    },
  });
}
