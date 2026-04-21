import crypto from 'node:crypto';

const digestRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest();
};

export const hashRefreshToken = (token) => {
  return digestRefreshToken(token).toString('hex');
};

export const compareRefreshToken = (token, storedHash) => {
  if (!/^[a-f0-9]{64}$/i.test(storedHash ?? '')) {
    return false;
  }

  const currentDigest = digestRefreshToken(token);
  const storedDigest = Buffer.from(storedHash, 'hex');

  return crypto.timingSafeEqual(currentDigest, storedDigest);
};
