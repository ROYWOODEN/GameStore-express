import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from 'passport';
import { errorHandler } from '#src/middleware/error.middleware.js';
import { logger } from '#src/core/logger.js';
import { gamesRouter } from './modules/games/index.js';
import { authRouter } from './modules/Auth/index.js';
import { userRouter } from './modules/user/index.js';
import { favoritesRouter } from './modules/favorites/index.js';
import { basketRouter } from './modules/basket/index.js';
import { paymentsRouter } from './modules/payments/index.js';
import { ordersRouter } from './modules/orders/index.js';
import { libraryRouter } from './modules/library/index.js';
import { reviewsRouter } from './modules/reviews/index.js';
import cookieParser from 'cookie-parser';
import '#src/modules/Auth/config/passport.js';

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Костыль для BigInt - один раз и навсегда
BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use('/api', gamesRouter);
app.use('/api', authRouter);
app.use('/api', userRouter);
app.use('/api', favoritesRouter);
app.use('/api', basketRouter);
app.use('/api', paymentsRouter);
app.use('/api', ordersRouter);
app.use('/api', libraryRouter);
app.use('/api', reviewsRouter);

app.get('/', async (_, res) => {
  logger.info('GET / - Homepage request');
  res.send('<h1>Главная</h1>');
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// errorHandler ДОЛЖЕН быть последним middleware
app.use(errorHandler);

export { app };
