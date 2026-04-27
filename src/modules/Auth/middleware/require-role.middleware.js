import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { findUserRoleByIdRecord } from '../repositories/auth.repository.js';

export const requireRole = (...roles) => {
  const allowedRoles = roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);

  return async (req, _res, next) => {
    const userId = req.auth?.userId;

    if (!userId) {
      return next(
        new AppError({
          debug: `Missing auth context on role-protected route: ${req.originalUrl}`,
          type: ERROR_TYPES.AUTH,
          message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
        }),
      );
    }

    const user = await findUserRoleByIdRecord({ userId });

    if (!user?.roles?.name) {
      return next(
        new AppError({
          debug: `User role was not found for user ${userId}`,
          type: ERROR_TYPES.AUTH,
          message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
        }),
      );
    }

    const currentRole = String(user.roles.name).trim().toLowerCase();

    req.auth.role = user.roles.name;

    if (allowedRoles.includes(currentRole)) {
      return next();
    }

    return next(
      new AppError({
        debug: `Role ${user.roles.name} is not allowed for route ${req.originalUrl}`,
        type: ERROR_TYPES.AUTH,
        message: ERROR_MESSAGES.AUTH_FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN,
        details: {
          allowedRoles,
          currentRole,
        },
      }),
    );
  };
};
