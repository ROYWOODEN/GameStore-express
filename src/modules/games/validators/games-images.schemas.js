import { z } from 'zod';

const coerceBigInt = (fieldLabel) =>
  z.union([z.string(), z.number(), z.bigint()]).transform((value, ctx) => {
    try {
      return BigInt(value);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: `${fieldLabel} must be a valid integer id`,
      });

      return z.NEVER;
    }
  });

export const updateGameImagesOrderSchema = z
  .object({
    imageIds: z.array(coerceBigInt('Image id')).min(1, 'At least one image id is required'),
  })
  .strict()
  .superRefine((data, ctx) => {
    const imageIds = data.imageIds.map(String);

    if (new Set(imageIds).size !== imageIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['imageIds'],
        message: 'Image ids must be unique',
      });
    }
  });
