import { HTTP_STATUS, STATUS_TEXT, ERROR_TYPES } from '#src/constants/httpStatuses.js';
import { ERROR_MESSAGES } from '#src/constants/errorMessages.js';

const DEFAULT_APP_ERROR_STATUS_BY_TYPE = {
  [ERROR_TYPES.VALIDATION]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_TYPES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_TYPES.AUTH]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_TYPES.UPLOAD]: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  [ERROR_TYPES.DB]: HTTP_STATUS.SERVICE_UNAVAILABLE,
  [ERROR_TYPES.INTERNAL]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
};

const resolveStatusByType = (type) =>
  DEFAULT_APP_ERROR_STATUS_BY_TYPE[type] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;

export function errorHandler(res, error) {
  if (error?.name === 'AppError') {
    const type = error.type || ERROR_TYPES.INTERNAL;
    const status = error.statusCode ?? resolveStatusByType(type);

    return res.status(status).json({
      success: false,
      error: {
        statusCode: status,
        statusText: STATUS_TEXT[status] || STATUS_TEXT[HTTP_STATUS.INTERNAL_SERVER_ERROR],
        type,
        message: error.message,
        details: error.details,
      },
    });
  }

  let type = ERROR_TYPES.INTERNAL;
  let message = ERROR_MESSAGES.INTERNAL;

  if (error?.code === 'LIMIT_FILE_SIZE') {
    type = ERROR_TYPES.UPLOAD;
    message = ERROR_MESSAGES.UPLOAD_FILE_TOO_LARGE;
  }

  if (error?.code === 'LIMIT_FILE_COUNT' || error?.code === 'LIMIT_UNEXPECTED_FILE') {
    type = ERROR_TYPES.UPLOAD;
    message = ERROR_MESSAGES.UPLOAD_TOO_MANY_FILES;
  }

  if (error?.name === 'JsonWebTokenError' || error?.name === 'UnauthorizedError') {
    type = ERROR_TYPES.AUTH;
    message = ERROR_MESSAGES.AUTH_UNAUTHORIZED;
  }

  if (error?.name === 'PrismaClientKnownRequestError') {
    type = ERROR_TYPES.DB;
    message = ERROR_MESSAGES.DB_UNAVAILABLE;
  }

  const statusCode = resolveStatusByType(type);

  return res.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      statusText: STATUS_TEXT[statusCode] || STATUS_TEXT[HTTP_STATUS.INTERNAL_SERVER_ERROR],
      type,
      message,
      details: null,
    },
  });
}
