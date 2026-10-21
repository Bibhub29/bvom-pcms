import express from 'express';

import {
    authenticate,
    authorizeRoles
} from '../middleware/authMiddleware.js';

import validate from '../middleware/validateMiddleware.js';

import {
    courseDraftParamsSchema,
    courseDraftCreateSchema,
    bulkImportDraftsSchema
} from '../validators/draftValidator.js';

import {
    listCourseDrafts,
    createCourseDraft,
    bulkImportCourseDrafts
} from '../controllers/draftController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get(
    '/',
    validate(courseDraftParamsSchema),
    listCourseDrafts
);

router.post(
    '/',
    authorizeRoles('admin', 'editor'),
    validate(courseDraftCreateSchema),
    createCourseDraft
);

router.post(
    '/bulk-import',
    authorizeRoles('admin', 'editor'),
    validate(bulkImportDraftsSchema),
    bulkImportCourseDrafts
);

export default router;