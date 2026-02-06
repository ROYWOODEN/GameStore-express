import multer from 'multer';
import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { FILE_TARGETS } from '../config/files.config.js';
import { AppError } from '#src/utils/AppError.js';
import { errorHandler } from '#src/utils/errorHadler.js';

const mapUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError({
        debug: 'File too large',
        type: 'ValidationError',
        message: 'error.games.file_too_large',
        statusCode: 413,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
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
  return new AppError({
    debug: err.message || 'Upload error',
    type: 'ValidationError',
    message: 'error.games.upload_failed',
    statusCode: 400,
  });
};

export const handleUploadMany = (req, res) => {
  try {
    const type = req.query.type;
    const cfg = FILE_TARGETS[type];
    if (!cfg)
      throw new AppError({
        debug: `Unknown upload type: ${type}`,
        type: 'ValidationError',
        message: 'error.games.unknown_upload_type',
        statusCode: 400,
      });

    const up = makeUpload(type);

    up.array('files', 10)(req, res, (err) => {
      try {
        if (err) throw mapUploadError(err);

        if (!req.files || req.files.length === 0) {
          throw new AppError({
            debug: 'No files uploaded',
            type: 'ValidationError',
            message: 'error.games.validation_images',
            statusCode: 400,
          });
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
