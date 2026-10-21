
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    nameKey: {
        type: String,
        required: true,
        select: false
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2000
    },
    iconUrl: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2048
    },
    commonDraft: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending',
        index: true
    },
    order: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

courseSchema.pre('validate', function () {
    if (this.name) {
        this.nameKey = this.name.trim().toLowerCase();
    }
});

courseSchema.index(
    { organizationId: 1, sectionId: 1, nameKey: 1 },
    { unique: true }
);

courseSchema.index({ organizationId: 1, sectionId: 1, order: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;
