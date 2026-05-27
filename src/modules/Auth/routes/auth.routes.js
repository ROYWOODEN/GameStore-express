import { Router } from 'express';
import { login, logout, refresh, register } from '../controllers/auth.controller.js';
import { onlyGuest } from '../middleware/require-guest.middleware.js';

const authRouter = Router();

authRouter.post('/auth/register', onlyGuest, register);
authRouter.post('/auth/login', onlyGuest, login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', logout);

export { authRouter };
