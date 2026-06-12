import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import {
  buildTargetFileUrl,
  cleanupTargetUrls,
  cleanupUploadedFiles,
} from '#src/modules/files/index.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import bcrypt from 'bcryptjs';
import { mapUserProfile } from '../mappers/user.mapper.js';
import {
  deleteUserByIdRecord,
  deleteUserProviderByCodeRecord,
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

  const { password, ...profileData } = parsed.data;
  const userData = { ...profileData };

  if (password) {
    userData.password_hash = await bcrypt.hash(password, 10);
  }

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

export const unlinkCurrentUserProvider = async ({ userId, providerCode }) => {
  const existingUser = await findUserProfileByIdRecord({ userId });

  if (!existingUser) {
    throw buildUserNotFoundError();
  }

  const linkedProviders = (existingUser.user_providers ?? [])
    .map((item) => item.providers?.code)
    .filter((code) => typeof code === 'string');

  if (!linkedProviders.includes(providerCode)) {
    return mapUserProfile(existingUser);
  }

  if (!existingUser.password_hash) {
    throw new AppError({
      debug: `User ${String(userId)} tried to unlink ${providerCode} without password auth`,
      type: ERROR_TYPES.AUTH,
      message: ERROR_MESSAGES.AUTH_PASSWORD_REQUIRED,
      statusCode: HTTP_STATUS.FORBIDDEN,
      details: { fields: ['password'] },
    });
  }

  await deleteUserProviderByCodeRecord({ userId, providerCode });

  const updatedUser = await findUserProfileByIdRecord({ userId });

  if (!updatedUser) {
    throw buildUserNotFoundError();
  }

  return mapUserProfile(updatedUser);
};

export const updateCurrentUserAvatar = async ({ userId, file }) => {
  if (!file) {
    throw new AppError({
      debug: 'No avatar uploaded',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.FILES_REQUIRED,
      details: { resource: 'user', field: 'avatar' },
    });
  }

  const existingUser = await findUserProfileByIdRecord({ userId });

  if (!existingUser) {
    cleanupUploadedFiles(file, {
      scope: 'users.avatar.update',
      reason: 'user_not_found',
      userId: String(userId),
    });

    throw buildUserNotFoundError();
  }

  const avatarUrl = buildTargetFileUrl('user_avatars', file.filename);

  let updatedUser;

  try {
    updatedUser = await updateUserProfileByIdRecord({
      userId,
      data: {
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    cleanupUploadedFiles(file, {
      scope: 'users.avatar.update',
      reason: 'db_error',
      userId: String(userId),
    });

    throw error;
  }

  if (existingUser.avatar_url && existingUser.avatar_url !== avatarUrl) {
    cleanupTargetUrls(existingUser.avatar_url, 'user_avatars', {
      scope: 'users.avatar.update',
      reason: 'replace_old_avatar',
      userId: String(userId),
    });
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

export const deleteCurrentUserAvatar = async (userId) => {
  const existingUser = await findUserProfileByIdRecord({ userId });

  if (!existingUser) {
    throw buildUserNotFoundError();
  }

  if (!existingUser.avatar_url) {
    return mapUserProfile(existingUser);
  }

  const updatedUser = await updateUserProfileByIdRecord({
    userId,
    data: {
      avatar_url: null,
    },
  });

  cleanupTargetUrls(existingUser.avatar_url, 'user_avatars', {
    scope: 'users.avatar.delete',
    reason: 'remove_avatar',
    userId: String(userId),
  });

  return mapUserProfile(updatedUser);
};
