import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { registerUser } from '../services/auth.services.js';
import { getRefreshCookieOptions } from '../utils/refresh-cookie.js';

export const register = async (req, res) => {
  logger.info('POST /api/auth/register - Register new user');

  const result = await registerUser({
    body: req.body,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  logger.success('The user was successfully created');

  res.cookie(
    'refreshToken',
    result.refreshToken,
    getRefreshCookieOptions(result.refreshTokenExpiresAt),
  );

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
};
