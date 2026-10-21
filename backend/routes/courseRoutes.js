
import express from 'express';

import {
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    reorderCourses
} from '../controllers/courseController.js';

import {
    courseListSchema,
    courseIdSchema,
    createCourseSchema,
    updateCourseSchema,
    reorderCoursesSchema
} from '../validators/courseValidator.js';

import { authenticate } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(authenticate);

router.get(
    '/',
    validate(courseListSchema),
    asyncHandler(listCourses)
);

router.get(
    '/:id',
    validate(courseIdSchema),
    asyncHandler(getCourse)
);

router.post(
    '/',
    validate(createCourseSchema),
    asyncHandler(createCourse)
);

router.put(
    '/:id',
    validate(updateCourseSchema),
    asyncHandler(updateCourse)
);

router.delete(
    '/:id',
    validate(courseIdSchema),
    asyncHandler(deleteCourse)
);

router.patch(
    '/reorder',
    validate(reorderCoursesSchema),
    asyncHandler(reorderCourses)
);

export default router;
