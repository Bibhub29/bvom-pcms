
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }

    return jwt.sign(
        {
            organizationId: user.organizationId.toString(),
            tokenVersion: user.tokenVersion,
            ...(user.isDemo ? { demo: true } : {})
        },
        process.env.JWT_SECRET,
        {
            subject: user._id.toString(),
            issuer: 'pcms-api',
            audience: 'pcms-client',
            algorithm: 'HS256'
        }
    );
};

export default generateToken;
