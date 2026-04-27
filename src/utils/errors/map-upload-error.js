import multer from 'multer';
import { AppError } from '#src/utils/errors/app-error.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';

export const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError({
        debug: 'File too large',
        type: ERROR_TYPES.UPLOAD,
        message: ERROR_MESSAGES.UPLOAD_FILE_TOO_LARGE,
        statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      });
    }

    // Multer throws LIMIT_UNEXPECTED_FILE when more files than allowed are uploaded
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError({
        debug: 'Too many files uploaded',
        type: ERROR_TYPES.UPLOAD,
        message: ERROR_MESSAGES.UPLOAD_TOO_MANY_FILES,
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
    }

    return new AppError({
      debug: 'Unexpected upload error',
      type: ERROR_TYPES.UPLOAD,
      message: ERROR_MESSAGES.UPLOAD_UNEXPECTED_UPLOAD_ERROR,
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  return new AppError({
    debug: err?.message || 'Upload error',
    type: ERROR_TYPES.UPLOAD,
    message: ERROR_MESSAGES.UPLOAD_FAILED,
    statusCode: HTTP_STATUS.BAD_REQUEST,
  });
};
