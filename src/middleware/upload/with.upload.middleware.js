import { makeUpload } from '#src/middleware/upload/upload.middleware.js';
import { mapUploadError } from '#src/utils/mapUploadError.js';
import { errorHandler } from '#src/utils/errorHadler.js';

export const withUpload = ({ type, field, maxCount }) => {
  const up = makeUpload(type);

  const run = maxCount > 1 ? up.array(field, maxCount) : up.single(field);

  return (req, res, next) => {
    run(req, res, (err) => {
      if (err) {
        errorHandler(res, mapUploadError(err));
        return;
      }
      next();
    });
  };
};
