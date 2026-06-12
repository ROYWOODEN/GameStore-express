import { z } from 'zod';

export const updateCurrentUserSchema = z
  .object({
    name: z.string().trim().min(3, 'Name is required'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  })
  .strict()
  .partial();
