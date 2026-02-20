import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { mapUploadError } from '#src/utils/mapUploadError.js';
import { FILE_TARGETS } from '../config/files.config.js';
import { AppError } from '#src/utils/AppError.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/httpStatuses.js';
import { ERROR_MESSAGES } from '#src/constants/errorMessages.js';
export const handleUploadMany = (req, res, next) => {
  const type = req.query.type;
  const cfg = FILE_TARGETS[type];
  if (!cfg) {
    return next(
      new AppError({
        debug: `Unknown upload type: ${type}`,
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.GAMES_UNKNOWN_UPLOAD_TYPE,
      }),
    );
  }

  const up = makeUpload(type);

  up.array('files', 10)(req, res, (err) => {
    if (err) {
      return next(mapUploadError(err));
    }

    if (!req.files || req.files.length === 0) {
      return next(
        new AppError({
          debug: 'No files uploaded',
          type: ERROR_TYPES.VALIDATION,
          message: ERROR_MESSAGES.GAMES_VALIDATION_IMAGES,
        }),
      );
    }

    const files = req.files.map((f) => ({
      savedAs: f.filename,
      url: `${cfg.urlBase}/${f.filename}`,
      mime: f.mimetype,
      size: f.size,
    }));

    return res.status(HTTP_STATUS.OK).json({ success: true, type, files });
  });
};
