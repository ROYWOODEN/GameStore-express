import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { logger } from '#src/core/logger.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser } from '../services/auth.services.js';
import { registerSchema } from '../validators/auth.schemas.js';

const normalizePrismaTarget = (target) => {
  if (Array.isArray(target)) {
    return target;
  }

  if (typeof target === 'string' && target.length > 0) {
    return [target];
  }

  return [];
};

export const register = async (req, res) => {
  logger.info('POST /api/auth/register - Register new user');

  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid registration data',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.AUTH_VALIDATION,
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || 'body',
        message: i.message,
      })),
    });
  }

  const { password, ...user } = parsed.data;

  const hashedPassword = await bcrypt.hash(password, 10);

  let createdUser;
  try {
    createdUser = await createUser(user, hashedPassword);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetFields = normalizePrismaTarget(error.meta?.target);

      if (targetFields.includes('email')) {
        throw new AppError({
          debug: error.message || 'Email already exists',
          type: ERROR_TYPES.VALIDATION,
          message: ERROR_MESSAGES.AUTH_EMAIL_TAKEN,
          statusCode: HTTP_STATUS.CONFLICT,
          details: { fields: ['email'] },
        });
      }
    }

    throw error;
  }

  const { roles, ...userData } = createdUser;

  const responseUser = {
    ...userData,
    role: roles.name,
  };

  const accessToken = jwt.sign(
    {
      userId: responseUser.id,
      role: responseUser.role,
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  logger.success('The user was successfully created');

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      accessToken: accessToken,
      user: responseUser,
    },
  });
};
