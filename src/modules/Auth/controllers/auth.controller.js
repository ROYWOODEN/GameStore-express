import passport from 'passport';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { AppError } from '#src/utils/errors/app-error.js';
import {
  authenticateGoogleUser,
  linkGoogleUser,
  loginUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
} from '../services/auth.services.js';
import { assertGoogleOAuthConfigured } from '../config/passport.js';
import { buildGoogleOAuthUrl } from '../utils/google-oauth-url.js';
import { getRefreshCookieBaseOptions, getRefreshCookieOptions } from '../utils/refresh-cookie.js';
import { buildOAuthRedirectUrl } from '../utils/oauth-redirect.js';
import {
  clearOAuthStateCookie,
  createOAuthState,
  OAUTH_STATE_ACTIONS,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from '../utils/oauth-state.js';
import { getRefreshToken, verifyToken } from '../utils/tokens.js';

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
  setOAuthStateCookie(res, 'google', {
    action: OAUTH_STATE_ACTIONS.SIGN_IN,
    state,
  });

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
    state,
  })(req, res, next);
};

export const handleGoogleLinkStart = (req, res, next) => {
  logger.info('POST /api/auth/google/link - Start Google OAuth link', {
    userId: String(req.auth.userId),
  });

  try {
    assertGoogleOAuthConfigured();
  } catch (error) {
    return next(error);
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, 'google', {
    action: OAUTH_STATE_ACTIONS.LINK,
    state,
    userId: req.auth.userId,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      url: buildGoogleOAuthUrl({ state }),
    },
  });
};

const hasValidRefreshToken = (req) => {
  const refreshToken = getRefreshToken(req);

  if (!refreshToken) {
    return false;
  }

  try {
    verifyToken({ token: refreshToken, type: 'refresh' });
    return true;
  } catch {
    return false;
  }
};

const redirectGoogleOAuthFailure = (
  res,
  { action = null, error = ERROR_MESSAGES.AUTH_OAUTH_FAILED },
) =>
  res.redirect(
    buildOAuthRedirectUrl({
      action,
      provider: 'google',
      status: 'error',
      error,
    }),
  );

const parseOAuthStateUserId = (value) => {
  try {
    const userId = BigInt(value);
    return userId > 0n ? userId : null;
  } catch {
    return null;
  }
};

export const handleGoogleAuthCallback = (req, res, next) => {
  logger.info('GET /api/auth/google/callback - Complete Google OAuth');

  try {
    assertGoogleOAuthConfigured();
  } catch (error) {
    return next(error);
  }

  const stateFromQuery = String(req.query.state ?? '');
  const stateFromCookie = readOAuthStateCookie(req, 'google');

  clearOAuthStateCookie(res, 'google');

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie.state) {
    logger.warn('Google OAuth failed: invalid state');
    return redirectGoogleOAuthFailure(res, {
      action: stateFromCookie?.action ?? null,
    });
  }

  if (stateFromCookie.action === OAUTH_STATE_ACTIONS.SIGN_IN && hasValidRefreshToken(req)) {
    logger.warn('Google OAuth failed: already authorized user tried sign-in flow');
    return redirectGoogleOAuthFailure(res, {
      action: stateFromCookie.action,
      error: ERROR_MESSAGES.AUTH_ALREADY_AUTHORIZED,
    });
  }

  const linkUserId =
    stateFromCookie.action === OAUTH_STATE_ACTIONS.LINK
      ? parseOAuthStateUserId(stateFromCookie.userId)
      : null;

  if (stateFromCookie.action === OAUTH_STATE_ACTIONS.LINK && !linkUserId) {
    logger.warn('Google OAuth failed: invalid link user id in state');
    return redirectGoogleOAuthFailure(res, {
      action: stateFromCookie.action,
    });
  }

  if (stateFromCookie.action === OAUTH_STATE_ACTIONS.LINK && !hasValidRefreshToken(req)) {
    logger.warn('Google OAuth failed: missing valid refresh token for link flow');
    return redirectGoogleOAuthFailure(res, {
      action: stateFromCookie.action,
      error: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
    });
  }

  return passport.authenticate('google', { session: false }, async (error, profile) => {
    if (error) {
      return next(error);
    }

    if (!profile) {
      logger.warn('Google OAuth failed: missing Google profile');
      return redirectGoogleOAuthFailure(res, {
        action: stateFromCookie.action,
      });
    }

    const isLinkAction = stateFromCookie.action === OAUTH_STATE_ACTIONS.LINK;

    try {
      const previousRefreshToken = getRefreshToken(req);

      const { refreshToken, refreshTokenExpiresAt } = isLinkAction
        ? await linkGoogleUser({
            currentUserId: linkUserId,
            profile,
            userAgent: req.get('user-agent'),
            ip: req.ip,
          })
        : await authenticateGoogleUser({
            profile,
            userAgent: req.get('user-agent'),
            ip: req.ip,
          });

      if (isLinkAction) {
        await logoutUser({ refreshToken: previousRefreshToken });
      }

      res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(refreshTokenExpiresAt));

      logger.success('Google OAuth completed successfully');
      return res.redirect(
        buildOAuthRedirectUrl({
          action: stateFromCookie.action,
          provider: 'google',
          status: 'success',
        }),
      );
    } catch (oauthError) {
      logger.warn('Google OAuth business flow failed', {
        message: oauthError?.message ?? 'unknown_error',
      });

      if (!isLinkAction) {
        res.clearCookie('refreshToken', getRefreshCookieBaseOptions());
      }

      if (oauthError instanceof AppError) {
        return res.redirect(
          buildOAuthRedirectUrl({
            action: stateFromCookie.action,
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
