import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { getRefreshCookieBaseOptions } from '#src/modules/Auth/utils/refresh-cookie.js';
import {
  deleteCurrentUser,
  deleteCurrentUserAvatar,
  getCurrentUser,
  unlinkCurrentUserProvider,
  updateCurrentUser,
  updateCurrentUserAvatar,
} from '../services/user.services.js';

export const handleGetCurrentUser = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('GET /api/users/me - Get current user', {
    userId: String(userId),
  });

  const user = await getCurrentUser(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user,
  });
};

export const handleUpdateCurrentUser = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('PATCH /api/users/me - Update current user', {
    userId: String(userId),
  });

  const user = await updateCurrentUser({
    userId,
    body: req.body,
  });

  logger.success('Current user updated', {
    userId: String(userId),
    fields: Object.keys(req.body ?? {}),
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user,
  });
};

export const handleUnlinkCurrentUserProvider = async (req, res) => {
  const userId = req.auth.userId;
  const providerCode = String(req.params.provider ?? '');

  logger.info('DELETE /api/users/me/providers/:provider - Unlink current user provider', {
    providerCode,
    userId: String(userId),
  });

  const user = await unlinkCurrentUserProvider({
    providerCode,
    userId,
  });

  logger.success('Current user provider unlinked', {
    providerCode,
    userId: String(userId),
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user,
  });
};

export const handleUpdateCurrentUserAvatar = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('PATCH /api/users/me/avatar - Update current user avatar', {
    userId: String(userId),
    filename: req.file?.filename ?? null,
  });

  const user = await updateCurrentUserAvatar({
    userId,
    file: req.file,
  });

  logger.success('Current user avatar updated', {
    userId: String(userId),
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user,
  });
};

export const handleDeleteCurrentUser = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('DELETE /api/users/me - Delete current user', {
    userId: String(userId),
  });

  await deleteCurrentUser(userId);

  res.clearCookie('refreshToken', getRefreshCookieBaseOptions());

  logger.success('Current user deleted', {
    userId: String(userId),
  });

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export const handleDeleteCurrentUserAvatar = async (req, res) => {
  const userId = req.auth.userId;

  logger.info('DELETE /api/users/me/avatar - Delete current user avatar', {
    userId: String(userId),
  });

  const user = await deleteCurrentUserAvatar(userId);

  logger.success('Current user avatar deleted', {
    userId: String(userId),
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user,
  });
};
