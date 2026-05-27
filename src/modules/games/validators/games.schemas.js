import { z } from 'zod';

export const createGameSchema = z
  .object({
    title: z.string().trim().min(2, 'Game title is required'),
    description: z.string().trim().min(10, 'Game description must contain at least 10 characters'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
  })
  .strict();

export const updateGameSchema = z
  .object({
    title: z.string().trim().min(1, 'Game title cannot be empty'),
    description: z.string().trim().min(1, 'Game description cannot be empty'),
    price: z.coerce.number().finite().min(0, 'Price cannot be negative'),
  })
  .strict()
  .partial();
