
import {
    validateOrganization as validateOrganizationService,
    login as loginService,
    logout as logoutService,
    getCurrentUser
} from '../services/authService.js';

import { successResponse } from '../utils/apiResponse.js';

const validateOrganization = async (req, res) => {
    const result = await validateOrganizationService(
        req.validatedQuery.code
    );

    return successResponse(res, {
        statusCode: 200,
        message: result.valid
            ? 'Organization is valid'
            : 'Organization is invalid or inactive',
        data: result
    });
};

const login = async (req, res) => {
    const result = await loginService(req.body);

    return successResponse(res, {
        statusCode: 200,
        message: 'Login successful',
        data: result
    });
};

const logout = async (req, res) => {
    await logoutService(
        req.user.id,
        req.user.organizationId,
        req.user.isDemo
    );

    return successResponse(res, {
        statusCode: 200,
        message: 'Logout successful',
        data: null
    });
};

const me = async (req, res) => {
    const user = await getCurrentUser(
        req.user.id,
        req.user.organizationId,
        req.user.isDemo
    );

    return successResponse(res, {
        statusCode: 200,
        message: 'User profile retrieved successfully',
        data: user
    });
};

export {
    validateOrganization,
    login,
    logout,
    me
};
