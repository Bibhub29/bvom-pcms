import express from 'express';

import { authenticate } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';

import {
    taskListSchema,
    createTaskSchema,
    taskIdSchema,
    updateTaskSchema,
    taskCompletionSchema,
    courseProgressSchema,
    activityListSchema,
    activityDateSchema,
    attendanceSchema
} from '../validators/trackerValidator.js';

import {
    listTasks,
    createTask,
    updateTask,
    updateTaskCompletion,
    deleteTask,
    getTrackerSummary,
    listTrackedCourses,
    getCourseProgress,
    updateCourseProgress,
    listActivity,
    upsertActivity,
    getAttendance
} from '../controllers/trackerController.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getTrackerSummary);

router.get('/courses', listTrackedCourses);

router.put(
    '/courses/:courseId/progress',
    validate(courseProgressSchema),
    updateCourseProgress
);

router.get(
    '/courses/:courseId/progress',
    validate({
        parse(input) {
            return {
                params: {
                    courseId: input.params.courseId
                },
                body: undefined,
                query: undefined
            };
        }
    }),
    getCourseProgress
);

router.get(
    '/tasks',
    validate(taskListSchema),
    listTasks
);

router.post(
    '/tasks',
    validate(createTaskSchema),
    createTask
);

router.patch(
    '/tasks/:id/completion',
    validate(taskCompletionSchema),
    updateTaskCompletion
);

router.put(
    '/tasks/:id',
    validate(updateTaskSchema),
    updateTask
);

router.delete(
    '/tasks/:id',
    validate(taskIdSchema),
    deleteTask
);

router.get(
    '/activity',
    validate(activityListSchema),
    listActivity
);

router.put(
    '/activity/:date',
    validate(activityDateSchema),
    upsertActivity
);

router.get(
    '/attendance',
    validate(attendanceSchema),
    getAttendance
);

export default router;