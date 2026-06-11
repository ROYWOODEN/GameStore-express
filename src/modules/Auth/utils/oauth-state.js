import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const getOAuthStateCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth/google',
});

const OAUTH_STATE_EXPIRES_IN_SECONDS = 10 * 60;

export const OAUTH_STATE_ACTIONS = {
  LINK: 'link',
  SIGN_IN: 'sign_in',
};

export const createOAuthState = () => crypto.randomUUID();

export const getOAuthStateCookieName = (provider) => `${provider}OAuthState`;

export const getOAuthStateCookieOptions = () => ({
  ...getOAuthStateCookieBaseOptions(),
  maxAge: OAUTH_STATE_EXPIRES_IN_SECONDS * 1000,
});

export const clearOAuthStateCookie = (res, provider) => {
  res.clearCookie(getOAuthStateCookieName(provider), getOAuthStateCookieBaseOptions());
};

const signOAuthStateCookie = ({ action, state, userId = null }) =>
  jwt.sign(
    {
      action,
      state,
      type: 'oauth_state',
      userId: userId === null ? null : String(userId),
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: OAUTH_STATE_EXPIRES_IN_SECONDS },
  );

export const readOAuthStateCookie = (req, provider) => {
  const token = req.cookies?.[getOAuthStateCookieName(provider)];

  if (typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    if (
      !payload ||
      typeof payload === 'string' ||
      payload.type !== 'oauth_state' ||
      typeof payload.state !== 'string' ||
      !Object.values(OAUTH_STATE_ACTIONS).includes(payload.action)
    ) {
      return null;
    }

    return {
      action: payload.action,
      state: payload.state,
      userId: payload.userId ?? null,
    };
  } catch {
    return null;
  }
};

export const setOAuthStateCookie = (res, provider, payload) => {
  res.cookie(
    getOAuthStateCookieName(provider),
    signOAuthStateCookie(payload),
    getOAuthStateCookieOptions(),
  );
};
