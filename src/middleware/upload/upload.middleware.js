// src/middleware/upload.middleware.js
import multer from 'multer';
import fs from 'fs';
import { FILE_TARGETS } from '#src/modules/files/config/files.config.js';
import { genFileName } from '#src/utils/fileName.js';
import { AppError } from '#src/utils/AppError.js';

// Создаём папку, если её нет (иначе сохранение упадёт)
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Фабрика: создаёт multer под КОНКРЕТНЫЙ type (game_images / user_avatars / ...)
export const makeUpload = (type) => {
  const cfg = FILE_TARGETS[type];
  if (!cfg) {
    // Если type неизвестный — сразу ошибка (никаких "что фронт скажет")
    throw new AppError('Unknown upload type', 'ValidationError', 'Неизвестный тип загрузки');
  }

  // Готовим папку
  ensureDir(cfg.dir);

  // Куда кладём и как называем файл
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, cfg.dir),
    filename: (_req, file, cb) => cb(null, genFileName(file.originalname)),
  });

  // Проверяем, что тип файла разрешён (mime) - временно разрешаем все, проверка в контроллере
  const fileFilter = (_req, file, cb) => {
    cb(null, true);
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
