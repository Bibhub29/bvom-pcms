import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    completedChapterIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter'
    }]
}, {
    timestamps: true,
    versionKey: false
});

courseProgressSchema.index(
    { organizationId: 1, userId: 1, courseId: 1 },
    { unique: true }
);

const CourseProgress = mongoose.model(
    'CourseProgress',
    courseProgressSchema
);

export default CourseProgress;