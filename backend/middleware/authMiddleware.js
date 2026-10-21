
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

const authenticate = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing from environment variables');
        }

        const token = authorization.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is missing'
            });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'pcms-api',
            audience: 'pcms-client'
        });

        if (
            typeof payload === 'string' ||
            !payload.sub ||
            !payload.organizationId ||
            !mongoose.isValidObjectId(payload.sub) ||
            !mongoose.isValidObjectId(payload.organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token'
            });
        }

        if (payload.demo === true) {
            if (process.env.NODE_ENV === 'production') {
                return res.status(401).json({ success: false, message: 'Demo authentication is disabled' });
            }
            const configuredCode = process.env.DEMO_ORGANIZATION_CODE?.trim().toUpperCase();
            const configuredEmail = process.env.DEMO_EMAIL?.trim().toLowerCase();
            const configuredPassword = process.env.DEMO_PASSWORD;
            if (!configuredCode || !configuredEmail || !configuredPassword) {
                return res.status(401).json({ success: false, message: 'Demo authentication is no longer configured' });
            }
            req.user = {
                id: payload.sub,
                organizationId: payload.organizationId,
                name: 'PCMS Demo User',
                email: configuredEmail,
                role: 'admin',
                tokenVersion: payload.tokenVersion,
                isDemo: true
            };
            req.organization = { id: payload.organizationId, name: 'PCMS Demo Organization', code: configuredCode };
            return next();
        }

        const user = await User.findById(payload.sub)
            .select('organizationId name email role isActive tokenVersion')
            .lean();

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is inactive or no longer exists'
            });
        }

        if (
            user.organizationId.toString() !== payload.organizationId ||
            user.tokenVersion !== payload.tokenVersion
        ) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is no longer valid'
            });
        }

        const organization = await Organization.findById(user.organizationId)
            .select('name code isActive')
            .lean();

        if (!organization || !organization.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Organization is inactive or unavailable'
            });
        }

        req.user = {
            id: user._id.toString(),
            organizationId: user.organizationId.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion
        };

        req.organization = {
            id: user.organizationId.toString(),
            name: organization.name,
            code: organization.code
        };

        next();
    } catch (error) {
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired authentication token'
            });
        }

        next(error);
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
};

const requireOrganizationAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const requestedOrganizationId =
        req.params?.organizationId ??
        req.query?.organizationId ??
        req.body?.organizationId;

    if (
        requestedOrganizationId !== undefined &&
        requestedOrganizationId !== null &&
        requestedOrganizationId !== ''
    ) {
        if (
            typeof requestedOrganizationId !== 'string' ||
            !mongoose.isValidObjectId(requestedOrganizationId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        if (requestedOrganizationId !== req.user.organizationId) {
            return res.status(403).json({
                success: false,
                message: 'Access to this organization is forbidden'
            });
        }
    }

    next();
};

export {
    authenticate,
    authorizeRoles,
    requireOrganizationAccess
};
