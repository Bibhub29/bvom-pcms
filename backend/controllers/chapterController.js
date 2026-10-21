
import {
    listChapters as listChaptersService,
    getChapterById,
    createChapter as createChapterService,
    updateChapter as updateChapterService,
    updateChapterStatus as updateChapterStatusService,
    deleteChapter as deleteChapterService,
    reorderChapters as reorderChaptersService,
    bulkImportChapters as bulkImportChaptersService
} from '../services/chapterService.js';

import { successResponse } from '../utils/apiResponse.js';

const listChapters = async (req, res) => {
    const result = await listChaptersService(
        req.user.organizationId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Chapters retrieved successfully',
        data: result.data,
        meta: result.meta
    });
};

const listCourseChapters = async (req, res) => {
    const result = await listChaptersService(
        req.user.organizationId,
        {
            ...req.validatedQuery,
            courseId: req.params.courseId
        }
    );

    return successResponse(res, {
        message: 'Course chapters retrieved successfully',
        data: result.data,
        meta: result.meta
    });
};

const getChapter = async (req, res) => {
    const chapter = await getChapterById(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Chapter retrieved successfully',
        data: chapter
    });
};

const createChapter = async (req, res) => {
    const chapter = await createChapterService(
        req.user.organizationId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Chapter created successfully',
        data: chapter
    });
};

const updateChapter = async (req, res) => {
    const chapter = await updateChapterService(
        req.user.organizationId,
        req.params.id,
        req.body
    );

    return successResponse(res, {
        message: 'Chapter updated successfully',
        data: chapter
    });
};

const updateChapterStatus = async (req, res) => {
    const chapter = await updateChapterStatusService(
        req.user.organizationId,
        req.params.id,
        req.body.status
    );

    return successResponse(res, {
        message: 'Chapter status updated successfully',
        data: chapter
    });
};

const deleteChapter = async (req, res) => {
    const result = await deleteChapterService(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Chapter deleted successfully',
        data: result
    });
};

const reorderChapters = async (req, res) => {
    const result = await reorderChaptersService(
        req.user.organizationId,
        req.body.courseId,
        req.body.items
    );

    return successResponse(res, {
        message: 'Chapters reordered successfully',
        data: result
    });
};

const bulkImportChapters = async (req, res) => {
    const result = await bulkImportChaptersService(
        req.user.organizationId,
        req.params.courseId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Chapters imported successfully',
        data: result
    });
};

export {
    listChapters,
    listCourseChapters,
    getChapter,
    createChapter,
    updateChapter,
    updateChapterStatus,
    deleteChapter,
    reorderChapters,
    bulkImportChapters
};
