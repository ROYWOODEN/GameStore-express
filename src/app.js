import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler, asyncHandler } from '#src/middleware/error.middleware.js';
import { logger } from '#src/core/logger.js';
import { gameRouter } from './modules/games/index.js';
import fileRouter from './modules/files/routes/files.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Костыль для BigInt - один раз и навсегда
BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use('/api', gameRouter);
app.use('/api', fileRouter);

app.get(
  '/',
  asyncHandler(async (_, res) => {
    logger.info('GET / - Homepage request');
    res.send('<h1>Главная</h1>');
  }),
);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// errorHandler ДОЛЖЕН быть последним middleware
app.use(errorHandler);

export { app };
