import path from 'path';

export const genFileName = (originalname) => {
  const ext = path.extname(originalname); // .jpg .png .mp4
  const name = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return name + ext;
};
