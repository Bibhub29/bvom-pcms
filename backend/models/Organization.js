
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Organization name is required'],
            trim: true,
            maxlength: 150
        },
        code: {
            type: String,
            required: [true, 'Organization code is required'],
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 50
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

organizationSchema.index({ code: 1 }, { unique: true });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
