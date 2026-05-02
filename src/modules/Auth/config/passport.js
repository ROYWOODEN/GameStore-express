import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { logger } from '#src/core/logger.js';

let googleStrategyInitialized = false;

const isGoogleOAuthConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL,
  );

const initializeGoogleStrategy = () => {
  if (googleStrategyInitialized) {
    return;
  }

  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(null, profile);
      },
    ),
  );

  googleStrategyInitialized = true;
};

export const assertGoogleOAuthConfigured = () => {
  if (isGoogleOAuthConfigured()) {
    initializeGoogleStrategy();
    return;
  }

  throw new AppError({
    debug:
      'Google OAuth is not configured. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL are required.',
    type: ERROR_TYPES.INTERNAL,
    message: ERROR_MESSAGES.AUTH_OAUTH_NOT_CONFIGURED,
    statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
  });
};

if (isGoogleOAuthConfigured()) {
  initializeGoogleStrategy();
} else {
  logger.warn('Google OAuth strategy is disabled: missing Google OAuth environment variables');
}

export { isGoogleOAuthConfigured };
