import crypto from 'node:crypto';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import jwt from 'jsonwebtoken';

const assertTokenDate = (value, fieldName) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new AppError({
      debug: `${fieldName} must be a valid date`,
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.INTERNAL,
    });
  }
};

export const signAccessToken = ({ userId }) =>
  jwt.sign(
    {
      userId: String(userId),
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN },
  );

export const signRefreshToken = ({ userId, sessionId, expiresAt }) => {
  assertTokenDate(expiresAt, 'expiresAt');

  return jwt.sign(
    {
      userId: String(userId),
      sessionId: String(sessionId),
      type: 'refresh',
      jti: crypto.randomUUID(),
      exp: Math.floor(expiresAt.getTime() / 1000),
    },
    process.env.JWT_REFRESH_SECRET,
  );
};

export const verifyToken = ({ token, type, ignoreExpiration = false }) => {
  const payload = jwt.verify(
    token,
    type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET,
    { ignoreExpiration },
  );

  if (!payload || typeof payload === 'string' || payload.type !== type) {
    throw new AppError({
      debug: `Invalid ${type} token payload`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
    });
  }

  return payload;
};

export const extractAccessToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const [type, token] = authHeader.trim().split(/\s+/);

  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;

  return token;
};

export const getRefreshToken = (req) => {
  return req.cookies?.refreshToken ?? null;
};
