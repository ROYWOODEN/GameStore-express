import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleDeleteCurrentUser,
  handleGetCurrentUser,
  handleUpdateCurrentUser,
} from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/users/me', ...authorize(), handleGetCurrentUser);
userRouter.patch('/users/me', ...authorize(), handleUpdateCurrentUser);
userRouter.delete('/users/me', ...authorize(), handleDeleteCurrentUser);

export { userRouter };
