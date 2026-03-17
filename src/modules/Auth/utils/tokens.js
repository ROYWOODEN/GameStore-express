import jwt from 'jsonwebtoken';

export const signAccessToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      role: user.role,
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN },
  );
