import asyncHandler from '../utils/asyncHandler.js';
import {
    successResponse
} from '../utils/apiResponse.js';

import {
    listDrafts as listDraftsService,
    listParentDrafts as listParentDraftsService,
    getDraftById as getDraftByIdService,
    createDraft as createDraftService,
    createParentDraft as createParentDraftService,
    updateDraft as updateDraftService,
    updateDraftStatus as updateDraftStatusService,
    deleteDraft as deleteDraftService,
    reorderDrafts as reorderDraftsService,
    bulkImportCourseDrafts as bulkImportCourseDraftsService
} from '../services/draftService.js';

const listDrafts = asyncHandler(async (req, res) => {
    const result = await listDraftsService(
        req.user.organizationId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Drafts retrieved successfully',
        data: result.drafts,
        meta: result.pagination
    });
});

const listSectionDrafts = asyncHandler(async (req, res) => {
    const result = await listParentDraftsService(
        req.user.organizationId,
        'section',
        req.params.sectionId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Section drafts retrieved successfully',
        data: result.drafts,
        meta: result.pagination
    });
});

const listCourseDrafts = asyncHandler(async (req, res) => {
    const result = await listParentDraftsService(
        req.user.organizationId,
        'course',
        req.params.courseId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Course drafts retrieved successfully',
        data: result.drafts,
        meta: result.pagination
    });
});

const listChapterDrafts = asyncHandler(async (req, res) => {
    const result = await listParentDraftsService(
        req.user.organizationId,
        'chapter',
        req.params.chapterId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Chapter drafts retrieved successfully',
        data: result.drafts,
        meta: result.pagination
    });
});

const getDraft = asyncHandler(async (req, res) => {
    const draft = await getDraftByIdService(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Draft retrieved successfully',
        data: draft
    });
});

const createDraft = asyncHandler(async (req, res) => {
    const draft = await createDraftService(
        req.user.organizationId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Draft created successfully',
        data: draft
    });
});

const createSectionDraft = asyncHandler(async (req, res) => {
    const draft = await createParentDraftService(
        req.user.organizationId,
        'section',
        req.params.sectionId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Section draft created successfully',
        data: draft
    });
});

const createCourseDraft = asyncHandler(async (req, res) => {
    const draft = await createParentDraftService(
        req.user.organizationId,
        'course',
        req.params.courseId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Course draft created successfully',
        data: draft
    });
});

const createChapterDraft = asyncHandler(async (req, res) => {
    const draft = await createParentDraftService(
        req.user.organizationId,
        'chapter',
        req.params.chapterId,
        req.body
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Chapter draft created successfully',
        data: draft
    });
});

const updateDraft = asyncHandler(async (req, res) => {
    const draft = await updateDraftService(
        req.user.organizationId,
        req.params.id,
        req.body
    );

    return successResponse(res, {
        message: 'Draft updated successfully',
        data: draft
    });
});

const updateDraftStatus = asyncHandler(async (req, res) => {
    const draft = await updateDraftStatusService(
        req.user.organizationId,
        req.params.id,
        req.body.status
    );

    return successResponse(res, {
        message: 'Draft status updated successfully',
        data: draft
    });
});

const deleteDraft = asyncHandler(async (req, res) => {
    const result = await deleteDraftService(
        req.user.organizationId,
        req.params.id
    );

    return successResponse(res, {
        message: 'Draft deleted successfully',
        data: result
    });
});

const reorderDrafts = asyncHandler(async (req, res) => {
    const drafts = await reorderDraftsService(
        req.user.organizationId,
        req.body
    );

    return successResponse(res, {
        message: 'Draft ordering saved successfully',
        data: drafts
    });
});

const bulkImportCourseDrafts = asyncHandler(async (req, res) => {
    const result = await bulkImportCourseDraftsService(
        req.user.organizationId,
        req.params.courseId,
        req.body.drafts
    );

    return successResponse(res, {
        statusCode: 201,
        message: 'Course drafts imported successfully',
        data: result
    });
});

export {
    listDrafts,
    listSectionDrafts,
    listCourseDrafts,
    listChapterDrafts,
    getDraft,
    createDraft,
    createSectionDraft,
    createCourseDraft,
    createChapterDraft,
    updateDraft,
    updateDraftStatus,
    deleteDraft,
    reorderDrafts,
    bulkImportCourseDrafts
};