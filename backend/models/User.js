
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: [true, 'User name is required'],
            trim: true,
            maxlength: 120
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            maxlength: 254
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            select: false
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            default: 'editor'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        tokenVersion: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

userSchema.index(
    { organizationId: 1, email: 1 },
    { unique: true }
);

userSchema.index({ organizationId: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
