import fs from 'fs';
import path from 'path';
import { logger } from '#src/core/logger.js';
import { FILE_TARGETS } from '#src/modules/files/config/files.config.js';

// Converts single value or array into a flat array.
const asArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

const logCleanupResult = (result, meta = {}) => {
  const payload = { ...result, ...meta };

  if (result.failed > 0) {
    logger.warn('File cleanup summary', payload);
    return;
  }

  logger.info('File cleanup summary', payload);
};

// Deletes files from absolute paths.
// Accepts one path or many paths.
export const cleanupFilePaths = (pathsInput, meta = {}) => {
  const paths = asArray(pathsInput).filter(isNonEmptyString);

  let removed = 0;
  let failed = 0;
  let missing = 0;

  paths.forEach((filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        missing += 1;
        return;
      }

      fs.unlinkSync(filePath);
      removed += 1;
    } catch (err) {
      failed += 1;
      logger.warn('Failed to cleanup file', {
        filePath,
        ...meta,
        err,
      });
    }
  });

  const result = {
    attempted: paths.length,
    removed,
    failed,
    missing,
  };

  if (result.attempted > 0) {
    logCleanupResult(result, meta);
  }

  return result;
};

// Deletes files received from multer (`file.path`) or direct path strings.
export const cleanupUploadedFiles = (filesInput, meta = {}) => {
  const paths = asArray(filesInput)
    .map((file) => (typeof file === 'string' ? file : file?.path))
    .filter(isNonEmptyString);

  return cleanupFilePaths(paths, meta);
};

// Deletes files by public URLs for a specific upload target.
export const cleanupTargetUrls = (urlsInput, target, meta = {}) => {
  const cfg = FILE_TARGETS[target];
  const urls = asArray(urlsInput);

  if (!cfg) {
    logger.warn('Unknown file target', {
      target,
      ...meta,
    });

    return {
      attempted: 0,
      removed: 0,
      failed: 0,
      missing: 0,
    };
  }

  const paths = urls
    .map((url) => {
      const cleanUrl = String(url || '')
        .split('?')[0]
        .split('#')[0];
      const normalizedUrl = cleanUrl.replace(/\\/g, '/');
      const expectedPrefix = `${cfg.urlBase}/`;

      if (!normalizedUrl.includes(expectedPrefix)) return null;

      const filename = path.basename(normalizedUrl);
      if (!filename || filename === '.' || filename === path.sep) return null;

      return path.join(cfg.dir, filename);
    })
    .filter(Boolean);

  return cleanupFilePaths(paths, {
    target,
    ...meta,
  });
};
