import { Router } from 'express';
import { authorize } from '#src/modules/Auth/helpers/authorize.helper.js';
import {
  handleCreateTag,
  handleDeleteTag,
  handleGetTag,
  handleListTags,
  handleListTagTypes,
  handleUpdateTag,
} from '../controllers/tags.controller.js';

const tagsRouter = Router();

tagsRouter.get('/tags', handleListTags);
tagsRouter.get('/tag-types', handleListTagTypes);
tagsRouter.get('/tags/:id', handleGetTag);
tagsRouter.post('/tags', ...authorize('admin'), handleCreateTag);
tagsRouter.patch('/tags/:id', ...authorize('admin'), handleUpdateTag);
tagsRouter.delete('/tags/:id', ...authorize('admin'), handleDeleteTag);

export { tagsRouter };
