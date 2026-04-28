import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { cleanupUploadedFiles } from '#src/modules/files/index.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { mapUploadError } from '#src/utils/errors/map-upload-error.js';

export const withUpload = ({ type, field, maxCount }) => {
  const up = makeUpload(type);

  const run = maxCount > 1 ? up.array(field, maxCount) : up.single(field);

  return (req, res, next) => {
    run(req, res, (err) => {
      if (err) {
        cleanupUploadedFiles(req.files ?? req.file, {
          scope: 'upload.middleware',
          reason: 'upload_error',
          target: type,
          field,
        });

        if (err instanceof AppError) {
          return next(err);
        }

        return next(mapUploadError(err));
      }
      next();
    });
  };
};
