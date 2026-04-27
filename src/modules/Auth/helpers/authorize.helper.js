import { requireAuth } from '../middleware/require-auth.middleware.js';
import { requireRole } from '../middleware/require-role.middleware.js';

export const authorize = (...roles) =>
  roles.length > 0 ? [requireAuth, requireRole(...roles)] : [requireAuth];
