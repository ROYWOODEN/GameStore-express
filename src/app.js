import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from '#src/middleware/error.middleware.js';
import { logger } from '#src/core/logger.js';
import { gamesRouter } from './modules/games/index.js';
import { authRouter } from './modules/Auth/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// Костыль для BigInt - один раз и навсегда
BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use('/api', gamesRouter);
app.use('/api', authRouter);

app.get('/', async (_, res) => {
  logger.info('GET / - Homepage request');
  res.send('<h1>Главная</h1>');
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// errorHandler ДОЛЖЕН быть последним middleware
app.use(errorHandler);

export { app };
