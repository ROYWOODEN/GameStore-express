import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './pagination.js';

const queryIntSchema = ({ defaultValue, max = null }) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      return value;
    },
    z.coerce
      .number()
      .int('Must be an integer')
      .min(1, 'Must be greater than 0')
      .pipe(max === null ? z.number() : z.number().max(max, `Must be ${max} or less`)),
  );

export const paginationQueryFields = {
  page: queryIntSchema({ defaultValue: DEFAULT_PAGE }),
  limit: queryIntSchema({ defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT }),
};
