import { z } from 'zod';
import { optionalTagIdsSchema, tagIdsSchema } from '#src/modules/tags/validators/tags.schemas.js';
import { paginationQueryFields } from '#src/utils/pagination/pagination.schemas.js';

const optionalSearchSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const tagModeSchema = z.enum(['all', 'any']).optional().default('all');

export const listGamesQuerySchema = z
  .object({
    search: optionalSearchSchema,
    tagIds: optionalTagIdsSchema,
    tagMode: tagModeSchema,
    ...paginationQueryFields,
  })
  .strict()
  .transform((data) => ({
    search: data.search,
    tagIds: data.tagIds ?? [],
    tagMode: data.tagMode,
    page: data.page,
    limit: data.limit,
  }));

export const createGameSchema = z
  .object({
    title: z.string().trim().min(2, 'Game title is required'),
    description: z.string().trim().min(10, 'Game description must contain at least 10 characters'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
    tagIds: tagIdsSchema,
  })
  .strict();

export const updateGameSchema = z
  .object({
    title: z.string().trim().min(1, 'Game title cannot be empty'),
    description: z.string().trim().min(1, 'Game description cannot be empty'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
    tagIds: tagIdsSchema.optional(),
  })
  .strict()
  .partial();
