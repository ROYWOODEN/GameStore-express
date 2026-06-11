import { Router } from 'express';
import {
  handleGoogleAuthCallback,
  handleGoogleLinkStart,
  handleGoogleAuthStart,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js';
import { authorize } from '../helpers/authorize.helper.js';
import { onlyGuest } from '../middleware/require-guest.middleware.js';

const authRouter = Router();

authRouter.post('/auth/register', onlyGuest, register);
authRouter.post('/auth/login', onlyGuest, login);
authRouter.get('/auth/google', onlyGuest, handleGoogleAuthStart);
authRouter.post('/auth/google/link', ...authorize(), handleGoogleLinkStart);
authRouter.get('/auth/google/callback', handleGoogleAuthCallback);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', logout);

export { authRouter };
