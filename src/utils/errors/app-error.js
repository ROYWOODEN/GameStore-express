import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';

const DEFAULT_STATUS_BY_TYPE = {
  [ERROR_TYPES.VALIDATION]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_TYPES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_TYPES.AUTH]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_TYPES.UPLOAD]: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  [ERROR_TYPES.DB]: HTTP_STATUS.SERVICE_UNAVAILABLE,
  [ERROR_TYPES.INTERNAL]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
};

export class AppError extends Error {
  constructor({
    debug = 'Unexpected error',
    type = ERROR_TYPES.INTERNAL,
    message = ERROR_MESSAGES.INTERNAL,
    statusCode = null,
    details = null,
  }) {
    super(debug);

    this.name = 'AppError';
    this.debug = debug;
    this.type = type;
    this.message = message;
    // default the statusCode from type if not explicitly provided
    this.statusCode =
      statusCode ?? DEFAULT_STATUS_BY_TYPE[type] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.details = details;
  }
}
