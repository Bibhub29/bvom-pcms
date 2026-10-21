import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    type: {
        type: String,
        enum: ['Update', 'Reminder', 'Tip', 'Alert'],
        default: 'Update'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    dismissedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

noticeSchema.index({
    organizationId: 1,
    isActive: 1,
    createdAt: -1
});

const Notice = mongoose.model('Notice', noticeSchema);

export default Notice;
