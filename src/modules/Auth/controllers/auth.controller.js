import passport from 'passport';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { AppError } from '#src/utils/errors/app-error.js';
import {
  authenticateGoogleUser,
  loginUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
} from '../services/auth.services.js';
import { assertGoogleOAuthConfigured } from '../config/passport.js';
import { getRefreshCookieBaseOptions, getRefreshCookieOptions } from '../utils/refresh-cookie.js';
import { buildOAuthRedirectUrl } from '../utils/oauth-redirect.js';
import {
  clearOAuthStateCookie,
  createOAuthState,
  getOAuthStateCookieName,
  setOAuthStateCookie,
} from '../utils/oauth-state.js';
import { getRefreshToken } from '../utils/tokens.js';

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

export const refresh = async (req, res) => {
  const refreshToken = getRefreshToken(req);

  logger.info('POST /api/auth/refresh - Refresh tokens');

  try {
    const {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt,
    } = await refreshUserTokens({
      refreshToken,
    });

    if (accessToken && nextRefreshToken && refreshTokenExpiresAt) {
      res.cookie('refreshToken', nextRefreshToken, getRefreshCookieOptions(refreshTokenExpiresAt));
    }

    logger.success('Token refresh was successful');
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.message === ERROR_MESSAGES.AUTH_REFRESH_FAILED) {
      res.clearCookie('refreshToken', getRefreshCookieBaseOptions());
    }

    throw error;
  }
};

export const logout = async (req, res) => {
  const refreshToken = getRefreshToken(req);

  logger.info('POST /api/auth/logout - Logout user');

  await logoutUser({ refreshToken });

  res.clearCookie('refreshToken', getRefreshCookieBaseOptions());

  logger.success('Logout was successful');
  return res.status(HTTP_STATUS.OK).json({
    success: true,
  });
};

export const handleGoogleAuthStart = (req, res, next) => {
  logger.info('GET /api/auth/google - Start Google OAuth');

  try {
    assertGoogleOAuthConfigured();
  } catch (error) {
    return next(error);
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, 'google', state);

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
    state,
  })(req, res, next);
};

export const handleGoogleAuthCallback = (req, res, next) => {
  logger.info('GET /api/auth/google/callback - Complete Google OAuth');

  try {
    assertGoogleOAuthConfigured();
  } catch (error) {
    return next(error);
  }

  const stateFromQuery = String(req.query.state ?? '');
  const stateFromCookie = req.cookies?.[getOAuthStateCookieName('google')] ?? null;

  clearOAuthStateCookie(res, 'google');

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    logger.warn('Google OAuth failed: invalid state');
    return res.redirect(
      buildOAuthRedirectUrl({
        provider: 'google',
        status: 'error',
        error: ERROR_MESSAGES.AUTH_OAUTH_FAILED,
      }),
    );
  }

  return passport.authenticate('google', { session: false }, async (error, profile) => {
    if (error) {
      return next(error);
    }

    if (!profile) {
      logger.warn('Google OAuth failed: missing Google profile');
      return res.redirect(
        buildOAuthRedirectUrl({
          provider: 'google',
          status: 'error',
          error: ERROR_MESSAGES.AUTH_OAUTH_FAILED,
        }),
      );
    }

    try {
      const { refreshToken, refreshTokenExpiresAt } = await authenticateGoogleUser({
        profile,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });

      res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(refreshTokenExpiresAt));

      logger.success('Google OAuth completed successfully');
      return res.redirect(
        buildOAuthRedirectUrl({
          provider: 'google',
          status: 'success',
        }),
      );
    } catch (oauthError) {
      logger.warn('Google OAuth business flow failed', {
        message: oauthError?.message ?? 'unknown_error',
      });

      res.clearCookie('refreshToken', getRefreshCookieBaseOptions());

      if (oauthError instanceof AppError) {
        return res.redirect(
          buildOAuthRedirectUrl({
            provider: 'google',
            status: 'error',
            error: oauthError.message,
          }),
        );
      }

      return next(oauthError);
    }
  })(req, res, next);
};
