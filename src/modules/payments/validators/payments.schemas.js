import { z } from 'zod';

const paymentGameIdSchema = z.union([
  z.string().trim().min(1, 'gameId is required'),
  z.number().int().positive('gameId must be a positive integer'),
]);

export const createCheckoutPaymentSchema = z
  .array(paymentGameIdSchema)
  .min(1, 'At least one game is required');

export const yookassaWebhookSchema = z
  .object({
    type: z.literal('notification'),
    event: z.string().trim().min(1, 'event is required'),
    object: z
      .object({
        id: z.string().trim().min(1, 'payment id is required'),
        status: z.string().trim().optional(),
      })
      .passthrough(),
  })
  .passthrough();
