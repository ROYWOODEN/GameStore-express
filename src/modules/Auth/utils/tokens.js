import jwt from 'jsonwebtoken';

export const signAccessToken = ({ userId, role }) =>
  jwt.sign(
    {
      userId: String(userId),
      role: role,
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN },
  );

export const signRefreshToken = ({ userId, sessionId }) =>
  jwt.sign(
    {
      userId: String(userId),
      sessionId: String(sessionId),
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN },
  );

export const getTokenExpiresAt = (token) => {
  const payload = jwt.decode(token);

  if (!payload || typeof payload === 'string' || typeof payload.exp !== 'number') {
    throw new Error('Token expiration is missing');
  }

  return new Date(payload.exp * 1000);
};
