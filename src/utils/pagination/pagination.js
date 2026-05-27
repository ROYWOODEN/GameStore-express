export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const getPaginationOffset = ({ page, limit }) => (page - 1) * limit;

export const buildPaginationMeta = ({ page, limit, total, count }) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    count,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
};
