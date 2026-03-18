import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import jwt from 'jsonwebtoken';

export const signAccessToken = ({ userId, role }) =>
  jwt.sign(
    {
      userId: String(userId),
      role: role,
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN },
  );

export const signRefreshToken = ({ userId, sessionId }) =>
  jwt.sign(
    {
      userId: String(userId),
      sessionId: String(sessionId),
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN },
  );

export const getTokenExpiresAt = (token) => {
  const payload = jwt.decode(token);

  if (!payload || typeof payload === 'string' || typeof payload.exp !== 'number') {
    throw new AppError({
      debug: 'Failed to read expiration from signed token',
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.INTERNAL,
    });
  }

  return new Date(payload.exp * 1000);
};
