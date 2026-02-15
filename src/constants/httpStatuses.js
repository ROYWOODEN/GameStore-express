// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Status texts for responses
export const STATUS_TEXT = {
  [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
  [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
  [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
  [HTTP_STATUS.NOT_FOUND]: 'Not Found',
  [HTTP_STATUS.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

// Error types
export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  AUTH: 'AuthError',
  UPLOAD: 'UploadError',
  DB: 'DbError',
  INTERNAL: 'InternalError',
  NOT_FOUND: 'NotFoundError',
};

// Error message keys (for i18n)
export const ERROR_MESSAGES = {
  // Common
  INTERNAL: 'errors.internal',
  AUTH_UNAUTHORIZED: 'errors.auth.unauthorized',
  UPLOAD_FILE_TOO_LARGE: 'errors.upload.file_too_large',
  UPLOAD_TOO_MANY_FILES: 'errors.upload.too_many_files',
  DB_UNAVAILABLE: 'errors.db.unavailable',

  // Games
  GAMES_NOT_FOUND: 'error.games.not_found',
  GAMES_VALIDATION: 'error.games.validation',
  GAMES_VALIDATION_IMAGES: 'error.games.validation_images',
  GAMES_INVALID_FILE_TYPE: 'error.games.invalid_file_type',
  GAMES_NO_FIELDS_TO_UPDATE: 'error.games.no_fields_to_update',
  GAMES_NO_VALID_FIELDS_TO_UPDATE: 'error.games.no_valid_fields_to_update',
  GAMES_FILE_TOO_LARGE: 'error.games.file_too_large',
  GAMES_TOO_MANY_FILES: 'error.games.too_many_files',
  GAMES_UNEXPECTED_UPLOAD_ERROR: 'error.games.unexpected_upload_error',
  GAMES_UPLOAD_FAILED: 'error.games.upload_failed',
  GAMES_UNKNOWN_UPLOAD_TYPE: 'error.games.unknown_upload_type',
};
