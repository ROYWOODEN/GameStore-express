import { z } from 'zod';

const ratingSchema = z.coerce
  .number()
  .int('Rating must be an integer')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating cannot be greater than 5');

const reviewTextSchema = z.union([
  z
    .string()
    .trim()
    .max(2000, 'Review text must contain 2000 characters or less')
    .transform((value) => (value.length === 0 ? null : value)),
  z.null(),
]);

export const createReviewSchema = z
  .object({
    rating: ratingSchema,
    text: reviewTextSchema.optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    text: data.text ?? null,
  }));

export const updateReviewSchema = z
  .object({
    rating: ratingSchema.optional(),
    text: reviewTextSchema.optional(),
  })
  .strict();
