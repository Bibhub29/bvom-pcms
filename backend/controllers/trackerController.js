import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

import {
    listTasks as listTasksService,
    createTask as createTaskService,
    updateTask as updateTaskService,
    updateTaskCompletion as updateTaskCompletionService,
    deleteTask as deleteTaskService,
    getCourseProgress as getCourseProgressService,
    listTrackedCourses as listTrackedCoursesService,
    updateCourseProgress as updateCourseProgressService,
    getTrackerSummary as getTrackerSummaryService,
    listActivity as listActivityService,
    upsertActivity as upsertActivityService,
    getAttendance as getAttendanceService
} from '../services/trackerService.js';

const listTasks = asyncHandler(async (req, res) => {
    const result = await listTasksService(
        req.user.organizationId,
        req.user.id,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Tasks retrieved successfully',
        data: result.tasks,
        meta: result.pagination
    });
});

const createTask = asyncHandler(async (req, res) => {
    const task = await createTaskService(
        req.user.organizationId,
        req.user.id,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Task created successfully',
        data: task
    });
});

const updateTask = asyncHandler(async (req, res) => {
    const task = await updateTaskService(
        req.user.organizationId,
        req.user.id,
        req.params.id,
        req.body
    );

    return successResponse(res, {
        message: 'Task updated successfully',
        data: task
    });
});

const updateTaskCompletion = asyncHandler(async (req, res) => {
    const task = await updateTaskCompletionService(
        req.user.organizationId,
        req.user.id,
        req.params.id,
        req.body.isCompleted
    );

    return successResponse(res, {
        message: 'Task completion updated successfully',
        data: task
    });
});

const deleteTask = asyncHandler(async (req, res) => {
    const result = await deleteTaskService(
        req.user.organizationId,
        req.user.id,
        req.params.id
    );

    return successResponse(res, {
        message: 'Task deleted successfully',
        data: result
    });
});

const getTrackerSummary = asyncHandler(async (req, res) => {
    const summary = await getTrackerSummaryService(
        req.user.organizationId,
        req.user.id
    );

    return successResponse(res, {
        message: 'Tracker summary retrieved successfully',
        data: summary
    });
});

const listTrackedCourses = asyncHandler(async (req, res) => {
    const courses = await listTrackedCoursesService(
        req.user.organizationId,
        req.user.id
    );

    return successResponse(res, {
        message: 'Tracked courses retrieved successfully',
        data: courses
    });
});

const getCourseProgress = asyncHandler(async (req, res) => {
    const progress = await getCourseProgressService(
        req.user.organizationId,
        req.user.id,
        req.params.courseId
    );

    return successResponse(res, {
        message: 'Course progress retrieved successfully',
        data: progress
    });
});

const updateCourseProgress = asyncHandler(async (req, res) => {
    const progress = await updateCourseProgressService(
        req.user.organizationId,
        req.user.id,
        req.params.courseId,
        req.body.completedChapterIds
    );

    return successResponse(res, {
        message: 'Course progress saved successfully',
        data: progress
    });
});

const listActivity = asyncHandler(async (req, res) => {
    const activity = await listActivityService(
        req.user.organizationId,
        req.user.id,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Activity retrieved successfully',
        data: activity
    });
});

const upsertActivity = asyncHandler(async (req, res) => {
    const activity = await upsertActivityService(
        req.user.organizationId,
        req.user.id,
        req.params.date,
        req.body
    );

    return successResponse(res, {
        message: 'Activity saved successfully',
        data: activity
    });
});

const getAttendance = asyncHandler(async (req, res) => {
    const attendance = await getAttendanceService(
        req.user.organizationId,
        req.user.id,
        req.validatedQuery.months
    );

    return successResponse(res, {
        message: 'Attendance retrieved successfully',
        data: attendance
    });
});

export {
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
};