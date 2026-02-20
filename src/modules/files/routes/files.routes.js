import { Router } from 'express';
import { handleUploadMany } from '../controllers/files.controller.js';

export const filesRouter = Router();

filesRouter.post('/upload', handleUploadMany);
