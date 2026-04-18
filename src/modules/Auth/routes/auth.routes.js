import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';
import { onlyGuest } from '../middleware/guest.middleware.js';

const authRouter = Router();

authRouter.post('/auth/register', register);
authRouter.post('/auth/login', onlyGuest, login);

export { authRouter };
