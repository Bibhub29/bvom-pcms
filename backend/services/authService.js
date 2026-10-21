
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const demoCredentials = () => process.env.NODE_ENV === 'production' ? {} : ({
    organizationCode: process.env.DEMO_ORGANIZATION_CODE?.trim().toUpperCase(),
    email: process.env.DEMO_EMAIL?.trim().toLowerCase(),
    password: process.env.DEMO_PASSWORD
});

const matchesSecret = (provided, configured) => {
    const providedHash = crypto.createHash('sha256').update(String(provided ?? '')).digest();
    const configuredHash = crypto.createHash('sha256').update(String(configured ?? '')).digest();
    return crypto.timingSafeEqual(providedHash, configuredHash);
};

const loginWithDemoCredentials = (credentials) => {
    const demo = demoCredentials();
    if (!demo.organizationCode || !demo.email || !demo.password) return null;

    const matches = matchesSecret(credentials.organizationCode?.trim().toUpperCase(), demo.organizationCode)
        & matchesSecret(credentials.email?.trim().toLowerCase(), demo.email)
        & matchesSecret(credentials.password, demo.password);
    if (!matches) return null;

    const user = {
        _id: '000000000000000000000002',
        organizationId: '000000000000000000000001',
        tokenVersion: 0,
        name: 'PCMS Demo User',
        email: demo.email,
        role: 'admin',
        isDemo: true
    };
    return {
        token: generateToken(user),
        user: {
            id: user._id,
            organizationId: user.organizationId,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

const validateOrganization = async (code) => {
    const demo = demoCredentials();
    if (demo.organizationCode && matchesSecret(code?.trim().toUpperCase(), demo.organizationCode)) {
        return { valid: true };
    }
    const organization = await Organization.findOne({
        code: code.toUpperCase(),
        isActive: true
    })
        .select('_id')
        .lean();

    if (!organization) {
        return { valid: false };
    }

    return { valid: true };
};

const login = async ({ organizationCode, email, password }) => {
    const demoLogin = loginWithDemoCredentials({ organizationCode, email, password });
    if (demoLogin) return demoLogin;

    const organization = await Organization.findOne({
        code: organizationCode,
        isActive: true
    }).select('_id');

    if (!organization) {
        throw createError('Invalid organization code or credentials', 401);
    }

    const user = await User.findOne({
        organizationId: organization._id,
        email: email.toLowerCase(),
        isActive: true
    }).select('+password');

    if (!user) {
        throw createError('Invalid organization code or credentials', 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
        throw createError('Invalid organization code or credentials', 401);
    }

    const token = generateToken(user);

    return {
        token,
        user: {
            id: user._id.toString(),
            organizationId: user.organizationId.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

const logout = async (userId, organizationId, isDemo = false) => {
    if (isDemo) return { loggedOut: true };
    const result = await User.updateOne(
        {
            _id: userId,
            organizationId,
            isActive: true
        },
        {
            $inc: { tokenVersion: 1 }
        }
    );

    if (result.matchedCount !== 1) {
        throw createError('User account is no longer available', 401);
    }

    return { loggedOut: true };
};

const getCurrentUser = async (userId, organizationId, isDemo = false) => {
    if (isDemo) {
        const demo = demoCredentials();
        if (!demo.email || !demo.organizationCode || !demo.password) {
            throw createError('Demo account is no longer configured', 401);
        }
        return {
            id: userId,
            organizationId,
            name: 'PCMS Demo User',
            email: demo.email,
            role: 'admin'
        };
    }
    const user = await User.findOne({
        _id: userId,
        organizationId,
        isActive: true
    })
        .select('name email role organizationId isActive createdAt')
        .lean();

    if (!user) {
        throw createError('User account is no longer available', 401);
    }

    return {
        id: user._id.toString(),
        organizationId: user.organizationId.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    };
};

export {
    validateOrganization,
    login,
    logout,
    getCurrentUser
};
