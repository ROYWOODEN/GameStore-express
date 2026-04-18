import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getRefreshToken, verifyToken } from '../utils/tokens.js';

export const onlyGuest = (req, res, next) => {
  const refreshToken = getRefreshToken(req);

  if (!refreshToken) {
    return next();
  }

  try {
    verifyToken({ token: refreshToken, type: 'refresh' });

    return next(
      new AppError({
        debug: `User with refresh token tried to access guest-only route: ${req.originalUrl}`,
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_ALREADY_AUTHORIZED,
        statusCode: HTTP_STATUS.FORBIDDEN,
      }),
    );
  } catch {
    return next();
  }
};
