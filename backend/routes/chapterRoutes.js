import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { chapterListSchema, chapterIdSchema, createChapterSchema, updateChapterSchema, updateChapterStatusSchema, reorderChaptersSchema } from '../validators/chapterValidator.js';
import { listChapters, getChapter, createChapter, updateChapter, updateChapterStatus, deleteChapter, reorderChapters } from '../controllers/chapterController.js';

const router=express.Router();
router.use(authenticate);
router.get('/',validate(chapterListSchema),asyncHandler(listChapters));
router.get('/:id',validate(chapterIdSchema),asyncHandler(getChapter));
router.post('/',authorizeRoles('admin','editor'),validate(createChapterSchema),asyncHandler(createChapter));
router.put('/:id',authorizeRoles('admin','editor'),validate(updateChapterSchema),asyncHandler(updateChapter));
router.patch('/:id/status',authorizeRoles('admin','editor'),validate(updateChapterStatusSchema),asyncHandler(updateChapterStatus));
router.delete('/:id',authorizeRoles('admin','editor'),validate(chapterIdSchema),asyncHandler(deleteChapter));
router.patch('/reorder',authorizeRoles('admin','editor'),validate(reorderChaptersSchema),asyncHandler(reorderChapters));
export default router;
