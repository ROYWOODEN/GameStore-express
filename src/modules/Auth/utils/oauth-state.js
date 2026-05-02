import crypto from 'node:crypto';

const getOAuthStateCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth/google',
});

export const createOAuthState = () => crypto.randomUUID();

export const getOAuthStateCookieName = (provider) => `${provider}OAuthState`;

export const getOAuthStateCookieOptions = () => ({
  ...getOAuthStateCookieBaseOptions(),
  maxAge: 10 * 60 * 1000,
});

export const clearOAuthStateCookie = (res, provider) => {
  res.clearCookie(getOAuthStateCookieName(provider), getOAuthStateCookieBaseOptions());
};

export const setOAuthStateCookie = (res, provider, state) => {
  res.cookie(getOAuthStateCookieName(provider), state, getOAuthStateCookieOptions());
};
