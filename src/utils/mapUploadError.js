import multer from 'multer';
import { AppError } from '#src/utils/AppError.js';

export const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError({
        debug: 'File too large',
        type: 'ValidationError',
        message: 'error.games.file_too_large',
        statusCode: 413,
      });
    }
    // Multer throws LIMIT_UNEXPECTED_FILE when more files than allowed are uploaded
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError({
        debug: 'Too many files uploaded',
        type: 'ValidationError',
        message: 'error.games.too_many_files',
        statusCode: 400,
      });
    }
    return new AppError({
      debug: 'Unexpected upload error',
      type: 'ValidationError',
      message: 'error.games.unexpected_upload_error',
      statusCode: 400,
    });
  }
  return new AppError(err.message || 'Upload error', 'ValidationError', 'Недопустимый тип файла');
};
