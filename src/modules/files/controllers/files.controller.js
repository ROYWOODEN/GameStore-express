import multer from 'multer';
import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { FILE_TARGETS } from '../config/files.config.js';
import { AppError } from '#src/utils/AppError.js';
import { errorHandler } from '#src/utils/errorHadler.js';

const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError(
        'Uploaded file is too large',
        'ValidationError',
        'Загруженный файл слишком велик',
        413,
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return new AppError('Too many files', 'ValidationError', 'Слишком много файлов', 400);
    }
    return new AppError(err.message, 'ValidationError', 'Ошибка загрузки файла', 400);
  }
  return new AppError(
    err.message || 'Upload error',
    'ValidationError',
    'Недопустимый тип файла',
    400,
  );
};

export const handleUploadMany = (req, res) => {
  try {
    const type = req.query.type;
    const cfg = FILE_TARGETS[type];
    if (!cfg)
      throw new AppError('Unknown upload type', 'ValidationError', 'Неизвестный тип загрузки', 400);

    const up = makeUpload(type);

    up.array('files', 10)(req, res, (err) => {
      try {
        if (err) throw mapUploadError(err);

        if (!req.files || req.files.length === 0) {
          throw new AppError(
            'No files uploaded (field must be "files")',
            'ValidationError',
            'Файлы не были загружены',
            400,
          );
        }

        const files = req.files.map((f) => ({
          savedAs: f.filename,
          url: `${cfg.urlBase}/${f.filename}`,
          mime: f.mimetype,
          size: f.size,
        }));

        return res.json({ success: true, type, files });
      } catch (error) {
        return errorHandler(res, error);
      }
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
