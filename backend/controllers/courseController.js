
import {
    listCourses as listCoursesService,
    getCourse as getCourseService,
    createCourse as createCourseService,
    updateCourse as updateCourseService,
    deleteCourse as deleteCourseService,
    reorderCourses as reorderCoursesService
} from '../services/courseService.js';

import { successResponse } from '../utils/apiResponse.js';

const listCourses = async (req, res) => {
    const result = await listCoursesService(
        req.user.organizationId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Courses retrieved successfully',
        data: result.data,
        meta: result.meta
    });
};

const getCourse = async (req, res) => {
    const course = await getCourseService(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Course retrieved successfully',
        data: course
    });
};

const createCourse = async (req, res) => {
    const course = await createCourseService(
        req.user.organizationId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Course created successfully',
        data: course
    });
};

const updateCourse = async (req, res) => {
    const course = await updateCourseService(
        req.user.organizationId,
        req.params.id,
        req.body
    );

    return successResponse(res, {
        message: 'Course updated successfully',
        data: course
    });
};

const deleteCourse = async (req, res) => {
    const result = await deleteCourseService(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Course deleted successfully',
        data: result
    });
};

const reorderCourses = async (req, res) => {
    const result = await reorderCoursesService(
        req.user.organizationId,
        req.body.sectionId,
        req.body.items
    );

    return successResponse(res, {
        message: 'Courses reordered successfully',
        data: result
    });
};

export {
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    reorderCourses
};
