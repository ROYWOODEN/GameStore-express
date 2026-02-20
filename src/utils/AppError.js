import { ERROR_TYPES } from '#src/constants/httpStatuses.js';
import { ERROR_MESSAGES } from '#src/constants/errorMessages.js';

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
    this.statusCode = statusCode;
    this.details = details;
  }
}
