import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';

const organizationCode = process.env.DEMO_ORGANIZATION_CODE;
const email = process.env.DEMO_EMAIL?.toLowerCase();
const password = process.env.DEMO_PASSWORD;

if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo account seed is disabled in production.');
}

if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from environment variables');
}

if (!organizationCode || !email || !password) {
    throw new Error('DEMO_ORGANIZATION_CODE, DEMO_EMAIL, and DEMO_PASSWORD are required');
}

try {
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
    });

    const organization = await Organization.findOneAndUpdate(
        { code: organizationCode },
        { $set: { name: 'PCMS Demo Organization', isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate(
        { organizationId: organization._id, email },
        {
            $set: {
                name: 'PCMS Demo User',
                password: hashedPassword,
                role: 'admin',
                isActive: true
            },
            $setOnInsert: { tokenVersion: 0 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Demo login ready:');
    console.log(`  Organization: ${organizationCode}`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
} finally {
    await mongoose.disconnect();
}
