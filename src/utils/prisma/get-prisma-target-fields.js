export const getPrismaTargetFields = (target) => {
  if (Array.isArray(target)) {
    return target;
  }

  if (typeof target === 'string' && target.length > 0) {
    return [target];
  }

  return [];
};
