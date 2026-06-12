import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { FILE_TARGETS } from '../config/files.config.js';

export const buildTargetFileUrl = (target, filename) => {
  const cfg = FILE_TARGETS[target];

  if (!cfg) {
    throw new AppError({
      debug: `Unknown file target: ${target}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.UPLOAD_UNKNOWN_TYPE,
    });
  }

  return `${cfg.urlBase}/${filename}`;
};
