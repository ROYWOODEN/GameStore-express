export const getRefreshCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api',
});

export const getRefreshCookieOptions = (expiresAt) => ({
  ...getRefreshCookieBaseOptions(),
  expires: expiresAt,
});
