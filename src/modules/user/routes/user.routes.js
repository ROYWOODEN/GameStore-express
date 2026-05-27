import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import { withUpload } from '#src/middleware/upload/with-upload.middleware.js';
import {
  handleDeleteCurrentUser,
  handleDeleteCurrentUserAvatar,
  handleGetCurrentUser,
  handleUpdateCurrentUser,
  handleUpdateCurrentUserAvatar,
} from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/users/me', ...authorize(), handleGetCurrentUser);
userRouter.patch('/users/me', ...authorize(), handleUpdateCurrentUser);
userRouter.patch(
  '/users/me/avatar',
  ...authorize(),
  withUpload({ type: 'user_avatars', field: 'avatar', maxCount: 1 }),
  handleUpdateCurrentUserAvatar,
);
userRouter.delete('/users/me/avatar', ...authorize(), handleDeleteCurrentUserAvatar);
userRouter.delete('/users/me', ...authorize(), handleDeleteCurrentUser);

export { userRouter };
