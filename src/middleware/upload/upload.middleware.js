// src/middleware/upload.middleware.js
import multer from 'multer';
import fs from 'fs';
import { FILE_TARGETS } from '#src/modules/files/config/files.config.js';
import { genFileName } from '#src/modules/files/utils/file-name.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';

// Создаём папку, если её нет (иначе сохранение упадёт)
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Фабрика: создаёт multer под КОНКРЕТНЫЙ type (game_images / user_avatars / ...)
export const makeUpload = (type) => {
  const cfg = FILE_TARGETS[type];
  if (!cfg) {
    // Если type неизвестный — сразу ошибка (никаких "что фронт скажет")
    throw new AppError({
      debug: `Unknown upload type: ${type}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.UPLOAD_UNKNOWN_TYPE,
    });
  }

  // Готовим папку
  ensureDir(cfg.dir);

  // Куда кладём и как называем файл
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, cfg.dir),
    filename: (_req, file, cb) => cb(null, genFileName(file.originalname)),
  });

  // Проверяем, что тип файла разрешён (mime) - временно разрешаем все, проверка в сервисе
  const fileFilter = (_req, file, cb) => {
    if (cfg.mime.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      new AppError({
        debug: `Invalid file type for ${type}: ${file.mimetype}`,
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.INVALID_FILE_TYPE,
        details: {
          target: type,
          allowedTypes: cfg.mime,
          receivedType: file.mimetype,
          filename: file.originalname,
        },
      }),
    );
  };

  // ВОТ ТУТ ФИШКА: maxSize берём из конфига -> разные лимиты под разные type
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: cfg.maxSize,
    },
  });
};
