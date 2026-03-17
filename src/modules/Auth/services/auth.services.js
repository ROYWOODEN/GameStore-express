import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createUserRecord } from '../repositories/auth.repository.js';
import { signAccessToken } from '../utils/tokens.js';
import { registerSchema } from '../validators/auth.schemas.js';

export const registerUser = async (body) => {
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid registration data',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.AUTH_VALIDATION,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const { password, ...user } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  let createdUser;
  try {
    createdUser = await createUserRecord({
      ...user,
      passwordHash,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetFields = getPrismaTargetFields(error.meta?.target);

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

  return {
    user: responseUser,
    accessToken: signAccessToken(responseUser),
  };
};
