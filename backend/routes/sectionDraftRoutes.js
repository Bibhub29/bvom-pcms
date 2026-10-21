import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sectionDraftParamsSchema, sectionDraftCreateSchema } from '../validators/draftValidator.js';
import { listSectionDrafts, createSectionDraft } from '../controllers/draftController.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.get('/', validate(sectionDraftParamsSchema), asyncHandler(listSectionDrafts));
router.post('/', authorizeRoles('admin', 'editor'), validate(sectionDraftCreateSchema), asyncHandler(createSectionDraft));

export default router;
