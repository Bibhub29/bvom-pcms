import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sectionListSchema, sectionIdSchema, createSectionSchema, updateSectionSchema, reorderSectionsSchema } from '../validators/sectionValidator.js';
import { listSections, getSection, createSection, updateSection, deleteSection, reorderSections } from '../controllers/sectionController.js';

const router = express.Router();
router.use(authenticate);
router.get('/', validate(sectionListSchema), asyncHandler(listSections));
router.get('/:id', validate(sectionIdSchema), asyncHandler(getSection));
router.post('/', validate(createSectionSchema), asyncHandler(createSection));
router.put('/:id', validate(updateSectionSchema), asyncHandler(updateSection));
router.delete('/:id', validate(sectionIdSchema), asyncHandler(deleteSection));
router.patch('/reorder', validate(reorderSectionsSchema), asyncHandler(reorderSections));
export default router;
