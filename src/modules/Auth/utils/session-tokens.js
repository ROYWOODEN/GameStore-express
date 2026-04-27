import { getRefreshSessionExpiresAt } from './session-expiration.js';
import { hashRefreshToken } from './refresh-token-hash.js';
import { signAccessToken, signRefreshToken } from './tokens.js';

export const generateSessionTokens = async ({ userId, sessionId, absoluteExpiresAt }) => {
  const accessToken = signAccessToken({ userId });
  const refreshTokenExpiresAt = getRefreshSessionExpiresAt({
    absoluteExpiresAt,
  });
  const refreshToken = signRefreshToken({
    userId,
    sessionId,
    expiresAt: refreshTokenExpiresAt,
  });
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    refreshTokenExpiresAt,
  };
};
