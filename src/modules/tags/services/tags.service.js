import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { buildPaginationMeta } from '#src/utils/pagination/pagination.js';
import { getPrismaTargetFields } from '#src/utils/prisma/get-prisma-target-fields.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import { formatTag, formatTagType } from '../mappers/tag.mapper.js';
import {
  createTagRecord,
  deleteTagByIdRecord,
  findManyTagTypesRecord,
  findManyTagsRecord,
  findTagByIdRecord,
  findTagsByIdsRecord,
  findTagTypeByIdRecord,
  updateTagByIdRecord,
} from '../repositories/tags.repository.js';
import {
  createTagSchema,
  entityIdSchema,
  listTagTypesQuerySchema,
  listTagsQuerySchema,
  updateTagSchema,
} from '../validators/tags.schemas.js';

const TAG_TYPE_ALIASES = {
  age: ['age', 'ages', 'age_rating', 'age rating', 'rating', 'ratings'],
  genre: ['genre', 'genres'],
  mode: ['mode', 'modes'],
  platform: ['platform', 'platforms', 'platforma'],
};

const GAME_TAG_RULES = {
  age: {
    min: 1,
    max: 1,
    message: 'Exactly one age tag is required',
  },
  genre: {
    min: 1,
    max: null,
    message: 'At least one genre tag is required',
  },
  mode: {
    min: 1,
    max: null,
    message: 'At least one mode tag is required',
  },
  platform: {
    min: 1,
    max: null,
    message: 'At least one platform tag is required',
  },
};

const normalizeName = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

const getTagTypeCode = (typeName) => {
  const normalized = normalizeName(typeName);

  for (const [code, aliases] of Object.entries(TAG_TYPE_ALIASES)) {
    if (aliases.includes(normalized)) {
      return code;
    }
  }

  return null;
};

const sortTagsForResponse = (tags) =>
  [...tags].sort((left, right) => {
    const typeDiff =
      Number(left.tag_types.sort_order ?? 0) - Number(right.tag_types.sort_order ?? 0);

    if (typeDiff !== 0) {
      return typeDiff;
    }

    return left.name.localeCompare(right.name);
  });

const buildTagNotFoundError = () =>
  new AppError({
    debug: 'Tag not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'tag' },
  });

const buildTagTypeNotFoundError = ({ typeId = null, type = null } = {}) =>
  new AppError({
    debug: 'Tag type not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.TAG_TYPE_NOT_FOUND,
    details: {
      resource: 'tag_type',
      ...(typeId !== null ? { typeId } : {}),
      ...(type !== null ? { type } : {}),
    },
  });

const parseTagEntityId = (value, field) => {
  const parsed = entityIdSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  throw new AppError({
    debug: `Invalid ${field}: ${value}`,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.VALIDATION_FAILED,
    details: mapZodIssues(parsed.error.issues),
  });
};

const validatePayload = (schema, body, debug) => {
  const parsed = schema.safeParse(body);

  if (parsed.success) {
    return parsed.data;
  }

  throw new AppError({
    debug,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.VALIDATION_FAILED,
    details: mapZodIssues(parsed.error.issues),
  });
};

const throwTagNameConflictIfNeeded = (error) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return;
  }

  const targetFields = getPrismaTargetFields(error.meta?.target);

  if (!targetFields.includes('name')) {
    return;
  }

  throw new AppError({
    debug: error.message || 'Tag name already exists',
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.TAG_NAME_TAKEN,
    statusCode: HTTP_STATUS.CONFLICT,
    details: { fields: ['name'] },
  });
};

const resolveTagTypeByName = async (typeName) => {
  const tagTypes = await findManyTagTypesRecord({ withTags: false });
  const requestedCode = getTagTypeCode(typeName);
  const requestedName = normalizeName(typeName);

  return (
    tagTypes.find((tagType) => {
      const tagTypeCode = getTagTypeCode(tagType.name);
      const tagTypeName = normalizeName(tagType.name);

      return (
        (requestedCode !== null && tagTypeCode === requestedCode) || tagTypeName === requestedName
      );
    }) ?? null
  );
};

const resolveTagType = async ({ typeId = undefined, type = undefined }) => {
  if (typeId !== undefined) {
    const tagType = await findTagTypeByIdRecord({ typeId });

    if (!tagType) {
      throw buildTagTypeNotFoundError({ typeId });
    }

    if (type !== undefined) {
      const tagTypeByName = await resolveTagTypeByName(type);

      if (!tagTypeByName || tagTypeByName.id !== tagType.id) {
        throw new AppError({
          debug: 'Tag type id and type name mismatch',
          type: ERROR_TYPES.VALIDATION,
          message: ERROR_MESSAGES.VALIDATION_FAILED,
          details: {
            fields: ['typeId', 'type'],
          },
        });
      }
    }

    return tagType;
  }

  const tagType = await resolveTagTypeByName(type);

  if (!tagType) {
    throw buildTagTypeNotFoundError({ type });
  }

  return tagType;
};

const validateGameTagRules = (tags) => {
  const actual = Object.fromEntries(Object.keys(GAME_TAG_RULES).map((code) => [code, 0]));

  for (const tag of tags) {
    const code = getTagTypeCode(tag.tag_types.name);

    if (code in actual) {
      actual[code] += 1;
    }
  }

  const violations = Object.entries(GAME_TAG_RULES).flatMap(([code, rule]) => {
    const count = actual[code];
    const belowMin = count < rule.min;
    const aboveMax = rule.max !== null && count > rule.max;

    return belowMin || aboveMax
      ? [
          {
            type: code,
            expected: {
              min: rule.min,
              max: rule.max,
            },
            actual: count,
            message: rule.message,
          },
        ]
      : [];
  });

  if (violations.length === 0) {
    return;
  }

  throw new AppError({
    debug: 'Invalid game tag selection',
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.GAME_TAG_RULES_FAILED,
    details: {
      fields: ['tagIds'],
      actual,
      violations,
    },
  });
};

export const resolveGameTagSelection = async (tagIds) => {
  const tags = await findTagsByIdsRecord({ tagIds });
  const foundTagIds = new Set(tags.map((tag) => String(tag.id)));
  const missingTagIds = tagIds.filter((tagId) => !foundTagIds.has(String(tagId)));

  if (missingTagIds.length > 0) {
    throw new AppError({
      debug: 'Some tags do not exist',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: {
        fields: ['tagIds'],
        missingTagIds: missingTagIds.map(String),
      },
    });
  }

  validateGameTagRules(tags);

  return tags;
};

export const listTags = async (query = {}) => {
  const params = validatePayload(listTagsQuerySchema, query, 'Invalid tags query');

  const tagType =
    params.typeId !== undefined || params.type !== undefined
      ? await resolveTagType({
          typeId: params.typeId,
          type: params.type,
        })
      : null;

  const { items, total } = await findManyTagsRecord({
    typeId: tagType?.id,
    search: params.search,
    page: params.page,
    limit: params.limit,
  });

  return {
    items: sortTagsForResponse(items).map(formatTag),
    meta: buildPaginationMeta({
      page: params.page,
      limit: params.limit,
      total,
      count: items.length,
    }),
  };
};

export const listTagTypes = async (query = {}) => {
  const params = validatePayload(listTagTypesQuerySchema, query, 'Invalid tag types query');
  const tagTypes = await findManyTagTypesRecord({
    withTags: params.withTags,
  });

  return tagTypes.map(formatTagType);
};

export const getTag = async (rawTagId) => {
  const tagId = parseTagEntityId(rawTagId, 'tagId');
  const tag = await findTagByIdRecord({ tagId });

  if (!tag) {
    throw buildTagNotFoundError();
  }

  return formatTag(tag);
};

export const createTag = async (body) => {
  const tagData = validatePayload(createTagSchema, body, 'Invalid tag payload');
  const tagType = await resolveTagType(tagData);

  try {
    const tag = await createTagRecord({
      name: tagData.name,
      typeId: tagType.id,
    });

    return formatTag(tag);
  } catch (error) {
    throwTagNameConflictIfNeeded(error);
    throw error;
  }
};

export const updateTag = async (rawTagId, body) => {
  const tagId = parseTagEntityId(rawTagId, 'tagId');
  const tagData = validatePayload(updateTagSchema, body, 'Invalid tag update payload');

  if (Object.keys(tagData).length === 0) {
    throw new AppError({
      debug: 'No fields to update',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE,
      details: { resource: 'tag' },
    });
  }

  const existingTag = await findTagByIdRecord({ tagId });

  if (!existingTag) {
    throw buildTagNotFoundError();
  }

  const data = {};

  if (tagData.name !== undefined) {
    data.name = tagData.name;
  }

  if (tagData.typeId !== undefined || tagData.type !== undefined) {
    if ((existingTag._count?.game_tags ?? 0) > 0) {
      throw new AppError({
        debug: 'Cannot change type of tag attached to games',
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.TAG_IN_USE,
        statusCode: HTTP_STATUS.CONFLICT,
        details: {
          resource: 'tag',
          reason: 'tag_type_change_blocked',
          games_count: existingTag._count?.game_tags ?? 0,
        },
      });
    }

    const tagType = await resolveTagType(tagData);
    data.type_id = tagType.id;
  }

  try {
    const tag = await updateTagByIdRecord({ tagId, data });
    return formatTag(tag);
  } catch (error) {
    throwTagNameConflictIfNeeded(error);
    throw error;
  }
};

export const removeTag = async (rawTagId) => {
  const tagId = parseTagEntityId(rawTagId, 'tagId');
  const tag = await findTagByIdRecord({ tagId });

  if (!tag) {
    throw buildTagNotFoundError();
  }

  if ((tag._count?.game_tags ?? 0) > 0) {
    throw new AppError({
      debug: 'Cannot delete tag attached to games',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.TAG_IN_USE,
      statusCode: HTTP_STATUS.CONFLICT,
      details: {
        resource: 'tag',
        games_count: tag._count?.game_tags ?? 0,
      },
    });
  }

  await deleteTagByIdRecord({ tagId });
};
