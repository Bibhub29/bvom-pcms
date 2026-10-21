import express from 'express';

import { authenticate } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { createNoticeSchema, noticeIdSchema } from '../validators/dashboardValidator.js';
import { listNotices, createNotice, dismissNotice } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', listNotices);
router.post('/', validate(createNoticeSchema), createNotice);
router.patch('/:id/dismiss', validate(noticeIdSchema), dismissNotice);

export default router;
