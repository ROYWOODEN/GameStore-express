// modules/files/files.config.js
import path from 'path';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
export const TMP_DIR = path.join(UPLOAD_ROOT, 'tmp');

export const FILE_TARGETS = {
  game_images: {
    dir: path.join(UPLOAD_ROOT, 'images', 'games'),
    urlBase: '/uploads/images/games',
    mime: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  user_avatars: {
    dir: path.join(UPLOAD_ROOT, 'images', 'avatars'),
    urlBase: '/uploads/images/avatars',
    mime: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  // позже:
  // game_videos: {}
};
