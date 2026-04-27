import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';

const DURATION_MULTIPLIERS_IN_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

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

const parseDurationToMs = (value, envName) => {
  const normalizedValue = String(value ?? '').trim();

  if (/^\d+$/.test(normalizedValue)) {
    return Number.parseInt(normalizedValue, 10) * 1000;
  }

  const match = normalizedValue.match(/^(\d+)([smhd])$/i);

  if (!match) {
    throw new AppError({
      debug: `${envName} must be a positive integer in seconds or use one of the supported units: s, m, h, d`,
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.INTERNAL,
    });
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  return amount * DURATION_MULTIPLIERS_IN_MS[unit];
};

const getRefreshTokenLifetimeMs = () => {
  return parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 'JWT_REFRESH_EXPIRES_IN');
};

export const getAbsoluteSessionExpiresAt = (issuedAt = new Date()) => {
  const expiresAt = new Date(issuedAt);

  expiresAt.setDate(expiresAt.getDate() + getSessionAbsoluteExpiresInDays());

  return expiresAt;
};

export const getRefreshSessionExpiresAt = ({ issuedAt = new Date(), absoluteExpiresAt }) => {
  if (!(absoluteExpiresAt instanceof Date) || Number.isNaN(absoluteExpiresAt.getTime())) {
    throw new AppError({
      debug: 'absoluteExpiresAt must be a valid date',
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.INTERNAL,
    });
  }

  const expiresAt = new Date(issuedAt.getTime() + getRefreshTokenLifetimeMs());

  if (expiresAt.getTime() > absoluteExpiresAt.getTime()) {
    return new Date(absoluteExpiresAt);
  }

  return expiresAt;
};
