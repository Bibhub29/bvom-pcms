
import express from 'express';

import {
    validateOrganization,
    login,
    logout,
    me
} from '../controllers/authController.js';

import {
    loginSchema,
    validateOrganizationSchema
} from '../validators/authValidator.js';

import validate from '../middleware/validateMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
    '/validate-organization',
    validate(validateOrganizationSchema),
    asyncHandler(validateOrganization)
);

router.post(
    '/login',
    validate(loginSchema),
    asyncHandler(login)
);

router.post(
    '/logout',
    authenticate,
    asyncHandler(logout)
);

router.get(
    '/me',
    authenticate,
    asyncHandler(me)
);

export default router;
