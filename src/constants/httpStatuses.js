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
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
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
