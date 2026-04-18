import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { loginUser, registerUser } from '../services/auth.services.js';
import { getRefreshCookieOptions } from '../utils/refresh-cookie.js';

export const register = async (req, res) => {
  logger.info('POST /api/auth/register - Register new user');

  const { accessToken, refreshToken, user, refreshTokenExpiresAt } = await registerUser({
    body: req.body,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  logger.success('The user was successfully created');

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(refreshTokenExpiresAt));

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      accessToken,
      user,
    },
  });
};

export const login = async (req, res) => {
  logger.info('POST /api/auth/login - Authenticate user');

  const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await loginUser({
    body: req.body,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(refreshTokenExpiresAt));

  logger.success('Authorization was successful');
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      accessToken,
      user: user,
    },
  });
};
