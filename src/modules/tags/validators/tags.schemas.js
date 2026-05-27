import { z } from 'zod';
import { paginationQueryFields } from '#src/utils/pagination/pagination.schemas.js';

export const entityIdSchema = z
  .union([
    z.bigint(),
    z.number().int('Id must be an integer'),
    z.string().trim().regex(/^\d+$/, 'Id must be a positive integer'),
  ])
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n, 'Id must be positive');

const tagNameSchema = z.string().trim().min(1, 'Tag name is required').max(100);

const tagTypeNameSchema = z.string().trim().min(1, 'Tag type is required').max(50);

const optionalSearchSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const booleanQuerySchema = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }

      return String(value).trim().toLowerCase();
    },
    z.enum(['true', 'false', '1', '0']),
  )
  .transform((value) => value === 'true' || value === '1');

const parseTagIdsInput = (value) => {
  if (value === undefined) {
    return value;
  }

  const parseString = (stringValue) => {
    const trimmed = stringValue.trim();

    if (trimmed.length === 0) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : stringValue;
      } catch {
        return stringValue;
      }
    }

    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  };

  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' ? parseString(item) : [item]));
  }

  if (typeof value === 'string') {
    return parseString(value);
  }

  return [value];
};

export const tagIdsSchema = z.preprocess(
  parseTagIdsInput,
  z
    .array(entityIdSchema)
    .min(1, 'At least one tag is required')
    .transform((ids) => {
      const seen = new Set();

      return ids.filter((id) => {
        const key = String(id);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    }),
);

export const optionalTagIdsSchema = tagIdsSchema.optional();

const createTagBaseSchema = z
  .object({
    name: tagNameSchema,
    typeId: entityIdSchema.optional(),
    type_id: entityIdSchema.optional(),
    type: tagTypeNameSchema.optional(),
  })
  .strict();

export const createTagSchema = createTagBaseSchema
  .superRefine((data, ctx) => {
    const typeId = data.typeId ?? data.type_id;

    if (typeId === undefined && data.type === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['typeId'],
        message: 'Tag type is required',
      });
    }
  })
  .transform((data) => ({
    name: data.name,
    typeId: data.typeId ?? data.type_id,
    type: data.type,
  }));

const updateTagBaseSchema = z
  .object({
    name: tagNameSchema.optional(),
    typeId: entityIdSchema.optional(),
    type_id: entityIdSchema.optional(),
    type: tagTypeNameSchema.optional(),
  })
  .strict();

export const updateTagSchema = updateTagBaseSchema.transform((data) => {
  const payload = {};

  if (data.name !== undefined) {
    payload.name = data.name;
  }

  const typeId = data.typeId ?? data.type_id;

  if (typeId !== undefined) {
    payload.typeId = typeId;
  }

  if (data.type !== undefined) {
    payload.type = data.type;
  }

  return payload;
});

export const listTagsQuerySchema = z
  .object({
    typeId: entityIdSchema.optional(),
    type_id: entityIdSchema.optional(),
    type: tagTypeNameSchema.optional(),
    search: optionalSearchSchema,
    ...paginationQueryFields,
  })
  .strict()
  .transform((data) => ({
    typeId: data.typeId ?? data.type_id,
    type: data.type,
    search: data.search,
    page: data.page,
    limit: data.limit,
  }));

export const listTagTypesQuerySchema = z
  .object({
    withTags: booleanQuerySchema.optional().default(false),
  })
  .strict();

export const gameTagsPayloadSchema = z
  .object({
    tagIds: tagIdsSchema,
  })
  .strict();
