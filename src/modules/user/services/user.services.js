import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { cleanupTargetUrls } from '#src/modules/files/index.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { mapUserProfile } from '../mappers/user.mapper.js';
import {
  deleteUserByIdRecord,
  findUserProfileByIdRecord,
  updateUserProfileByIdRecord,
} from '../repositories/user.repository.js';
import { updateCurrentUserSchema } from '../validators/user.schemas.js';

const buildUserNotFoundError = () =>
  new AppError({
    debug: 'User not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'user' },
  });

const throwEmailConflictIfNeeded = (error) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return;
  }

  const targetFields = getPrismaTargetFields(error.meta?.target);

  if (!targetFields.includes('email')) {
    return;
  }

  throw new AppError({
    debug: error.message || 'Email already exists',
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.USER_EMAIL_TAKEN,
    statusCode: HTTP_STATUS.CONFLICT,
    details: { fields: ['email'] },
  });
};

export const getCurrentUser = async (userId) => {
  const user = await findUserProfileByIdRecord({ userId });

  if (!user) {
    throw buildUserNotFoundError();
  }

  return mapUserProfile(user);
};

export const updateCurrentUser = async ({ userId, body }) => {
  const parsed = updateCurrentUserSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid user update data',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const userData = parsed.data;

  if (Object.keys(userData).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
      details: { resource: 'user' },
    });
  }

  const existingUser = await findUserProfileByIdRecord({ userId });

  if (!existingUser) {
    throw buildUserNotFoundError();
  }

  let updatedUser;

  try {
    updatedUser = await updateUserProfileByIdRecord({
      userId,
      data: userData,
    });
  } catch (error) {
    throwEmailConflictIfNeeded(error);
    throw error;
  }

  return mapUserProfile(updatedUser);
};

export const deleteCurrentUser = async (userId) => {
  const existingUser = await findUserProfileByIdRecord({ userId });

  if (!existingUser) {
    throw buildUserNotFoundError();
  }

  const deleted = await deleteUserByIdRecord({ userId });

  if (deleted.count === 0) {
    throw buildUserNotFoundError();
  }

  if (existingUser.avatar_url) {
    cleanupTargetUrls(existingUser.avatar_url, 'user_avatars', {
      scope: 'users.delete',
      userId: String(userId),
    });
  }
};
