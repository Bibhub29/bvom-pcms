import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

import {
    getDashboardSummary as getDashboardSummaryService,
    getDashboardSections as getDashboardSectionsService,
    listNotices as listNoticesService,
    createNotice as createNoticeService,
    dismissNotice as dismissNoticeService
} from '../services/dashboardService.js';

const getDashboardSummary = asyncHandler(async (req, res) => {
    const summary = await getDashboardSummaryService(
        req.user.organizationId,
        req.user.id
    );

    return successResponse(res, {
        message: 'Dashboard summary retrieved successfully',
        data: summary
    });
});

const getDashboardSections = asyncHandler(async (req, res) => {
    const result = await getDashboardSectionsService(
        req.user.organizationId,
        req.validatedQuery
    );

    return successResponse(res, {
        message: 'Dashboard sections retrieved successfully',
        data: result.sections,
        meta: result.pagination
    });
});

const listNotices = asyncHandler(async (req, res) => {
    const notices = await listNoticesService(
        req.user.organizationId,
        req.user.id
    );

    return successResponse(res, {
        message: 'Notices retrieved successfully',
        data: notices
    });
});

const createNotice = asyncHandler(async (req, res) => {
    const notice = await createNoticeService(req.user.organizationId, req.body);
    return successResponse(res, { statusCode: 201, message: 'Notice created successfully', data: notice });
});

const dismissNotice = asyncHandler(async (req, res) => {
    const result = await dismissNoticeService(
        req.user.organizationId,
        req.user.id,
        req.params.id
    );

    return successResponse(res, {
        message: 'Notice dismissed successfully',
        data: result
    });
});

export {
    getDashboardSummary,
    getDashboardSections,
    listNotices,
    createNotice,
    dismissNotice
};
