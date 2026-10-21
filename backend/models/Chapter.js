
import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Chapter name is required'],
        trim: true,
        maxlength: 200,
        validate: {
            validator: (value) => value.trim().length > 0,
            message: 'Chapter name cannot be empty'
        }
    },
    content: {
        type: String,
        default: ''
    },
    chatLink: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2048
    },
    order: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isInteger,
            message: 'Chapter order must be an integer'
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'Updated', 'Published'],
        default: 'Pending'
    }
}, {
    timestamps: true,
    versionKey: false
});

chapterSchema.index(
    { organizationId: 1, courseId: 1, order: 1 },
    { unique: true }
);

chapterSchema.index({ organizationId: 1, courseId: 1, status: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;
