import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { extractAccessToken, verifyToken } from '../utils/tokens.js';

export const requireAuth = (req, _res, next) => {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    return next(
      new AppError({
        debug: `Missing access token on protected route: ${req.originalUrl}`,
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
      }),
    );
  }

  try {
    const payload = verifyToken({
      token: accessToken,
      type: 'access',
    });

    let userId;
    try {
      userId = BigInt(payload.userId);
    } catch {
      return next(
        new AppError({
          debug: 'Invalid user id in access token payload',
          type: ERROR_TYPES.AUTH,
          message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
        }),
      );
    }

    req.auth = {
      userId,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
