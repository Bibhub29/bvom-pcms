import express from 'express';

import { authenticate } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';

import {
    dashboardSectionsSchema,
    noticeIdSchema
} from '../validators/dashboardValidator.js';

import {
    getDashboardSummary,
    getDashboardSections,
    listNotices,
    dismissNotice
} from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);

router.get(
    '/sections',
    validate(dashboardSectionsSchema),
    getDashboardSections
);

router.get('/notices', listNotices);

router.patch(
    '/notices/:id/dismiss',
    validate(noticeIdSchema),
    dismissNotice
);

export default router;
