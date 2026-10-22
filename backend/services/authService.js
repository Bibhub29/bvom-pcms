
import crypto from 'node:crypto';
import generateToken from '../utils/generateToken.js';

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const environmentCredentials = () => ({
    organizationCode: process.env.DEMO_ORGANIZATION_CODE?.trim().toUpperCase(),
    email: process.env.DEMO_EMAIL?.trim().toLowerCase(),
    password: process.env.DEMO_PASSWORD
});

const matchesSecret = (provided, configured) => {
    const providedHash = crypto.createHash('sha256').update(String(provided ?? '')).digest();
    const configuredHash = crypto.createHash('sha256').update(String(configured ?? '')).digest();
    return crypto.timingSafeEqual(providedHash, configuredHash);
};

const loginWithEnvironmentCredentials = (credentials) => {
    const configured = environmentCredentials();
    if (!configured.organizationCode || !configured.email || !configured.password) {
        throw createError('Environment login is not configured', 503);
    }

    const matches = matchesSecret(credentials.organizationCode?.trim().toUpperCase(), configured.organizationCode)
        & matchesSecret(credentials.email?.trim().toLowerCase(), configured.email)
        & matchesSecret(credentials.password, configured.password);
    if (!matches) return null;

    const user = {
        _id: '000000000000000000000002',
        organizationId: '000000000000000000000001',
        tokenVersion: 0,
        name: 'PCMS Environment User',
        email: configured.email,
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
    const configuredCode = environmentCredentials().organizationCode;
    return {
        valid: Boolean(configuredCode && matchesSecret(code?.trim().toUpperCase(), configuredCode))
    };
};

const login = async ({ organizationCode, email, password }) => {
    const result = loginWithEnvironmentCredentials({ organizationCode, email, password });
    if (!result) throw createError('Invalid organization code or credentials', 401);
    return result;
};

const logout = async () => {
    return { loggedOut: true };
};

const getCurrentUser = async (userId, organizationId) => {
    const configured = environmentCredentials();
    if (!configured.email || !configured.organizationCode || !configured.password) {
        throw createError('Environment login is no longer configured', 401);
    }
    return {
        id: userId,
        organizationId,
        name: 'PCMS Environment User',
        email: configured.email,
        role: 'admin'
    };
};

export {
    validateOrganization,
    login,
    logout,
    getCurrentUser
};
