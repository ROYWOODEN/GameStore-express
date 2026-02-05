import multer from 'multer';
import { AppError } from '#src/utils/AppError.js';

export const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError(
        'Uploaded file is too large',
        'ValidationError',
        'Загруженный файл слишком велик',
        413,
      );
    }
    // Multer throws LIMIT_UNEXPECTED_FILE when more files than allowed are uploaded
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError('Too many files', 'LIMIT_FILE_SIZE', 'Слишком много файлов');
    }
    return new AppError(err.message, 'ValidationError', 'Неожиданное поле');
  }
  return new AppError(err.message || 'Upload error', 'ValidationError', 'Недопустимый тип файла');
};
