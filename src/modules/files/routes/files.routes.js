import { Router } from 'express';
import { handleUploadMany } from '../controllers/files.controller.js';

const router = Router();

router.post('/upload', handleUploadMany);
export default router;
