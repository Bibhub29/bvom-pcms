import express from 'express';

import {
    authenticate,
    authorizeRoles
} from '../middleware/authMiddleware.js';

import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

import {
    draftListSchema,
    draftIdSchema,
    createDraftSchema,
    updateDraftSchema,
    updateDraftStatusSchema,
    reorderDraftsSchema
} from '../validators/draftValidator.js';

import {
    listDrafts,
    getDraft,
    createDraft,
    updateDraft,
    updateDraftStatus,
    deleteDraft,
    reorderDrafts
} from '../controllers/draftController.js';

const router = express.Router();

router.use(authenticate);

router.get(
    '/',
    validate(draftListSchema),
    listDrafts
);

router.patch(
    '/reorder',
    authorizeRoles('admin', 'editor'),
    validate(reorderDraftsSchema),
    reorderDrafts
);

router.post(
    '/',
    authorizeRoles('admin', 'editor'),
    validate(createDraftSchema),
    createDraft
);

router.get(
    '/:id',
    validate(draftIdSchema),
    getDraft
);

router.put(
    '/:id',
    authorizeRoles('admin', 'editor'),
    validate(updateDraftSchema),
    updateDraft
);

router.patch(
    '/:id/status',
    authorizeRoles('admin', 'editor'),
    validate(updateDraftStatusSchema),
    updateDraftStatus
);

router.delete(
    '/:id',
    authorizeRoles('admin', 'editor'),
    validate(draftIdSchema),
    deleteDraft
);

export default router;