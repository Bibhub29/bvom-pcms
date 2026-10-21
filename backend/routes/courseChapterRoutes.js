
import express from 'express';

import {
    listCourseChapters,
    bulkImportChapters
} from '../controllers/chapterController.js';

import {
    courseChapterListSchema,
    bulkImportChaptersSchema
} from '../validators/chapterValidator.js';

import {
    authenticate,
    authorizeRoles
} from '../middleware/authMiddleware.js';

import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get(
    '/',
    validate(courseChapterListSchema),
    asyncHandler(listCourseChapters)
);

router.post(
    '/bulk-import',
    authorizeRoles('admin', 'editor'),
    validate(bulkImportChaptersSchema),
    asyncHandler(bulkImportChapters)
);

export default router;
