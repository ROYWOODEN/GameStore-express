import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';

const getSessionAbsoluteExpiresInDays = () => {
  const value = Number.parseInt(process.env.SESSION_ABSOLUTE_EXPIRES_IN_DAYS ?? '', 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError({
      debug: 'SESSION_ABSOLUTE_EXPIRES_IN_DAYS must be a positive integer',
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.INTERNAL,
    });
  }

  return value;
};

export const getAbsoluteSessionExpiresAt = (issuedAt = new Date()) => {
  const expiresAt = new Date(issuedAt);

  expiresAt.setDate(expiresAt.getDate() + getSessionAbsoluteExpiresInDays());

  return expiresAt;
};
