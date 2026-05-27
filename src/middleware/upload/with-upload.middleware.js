import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { mapUploadError } from '#src/utils/errors/map-upload-error.js';

export const withUpload = ({ type, field, maxCount }) => {
  const up = makeUpload(type);

  const run = maxCount > 1 ? up.array(field, maxCount) : up.single(field);

  return (req, res, next) => {
    run(req, res, (err) => {
      if (err) {
        return next(mapUploadError(err));
      }
      next();
    });
  };
};
