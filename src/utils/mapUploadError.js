import multer from 'multer';
import { AppError } from '#src/utils/AppError.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/httpStatuses.js';
import { ERROR_MESSAGES } from '#src/constants/errorMessages.js';

export const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError({
        debug: 'File too large',
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.GAMES_FILE_TOO_LARGE,
        statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      });
    }

    // Multer throws LIMIT_UNEXPECTED_FILE when more files than allowed are uploaded
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError({
        debug: 'Too many files uploaded',
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.GAMES_TOO_MANY_FILES,
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
    }

    return new AppError({
      debug: 'Unexpected upload error',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.GAMES_UNEXPECTED_UPLOAD_ERROR,
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  return new AppError({
    debug: err?.message || 'Upload error',
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.GAMES_UPLOAD_FAILED,
    statusCode: HTTP_STATUS.BAD_REQUEST,
  });
};
