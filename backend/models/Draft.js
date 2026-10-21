
import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ['section', 'course', 'chapter'],
            required: true
        },
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            default: null
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null
        },
        chapterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chapter',
            default: null
        },
        draftName: {
            type: String,
            required: [true, 'Draft name is required'],
            trim: true,
            maxlength: 200,
            validate: {
                validator: (value) => value.trim().length > 0,
                message: 'Draft name cannot be empty'
            }
        },
        draftOrder: {
            type: Number,
            default: 1,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: 'Draft order must be an integer'
            }
        },
        content: {
            type: String,
            default: ''
        },
        commonDraft: {
            type: String,
            default: ''
        },
        customDraft: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'approved', 'published', 'rejected'],
            default: 'pending'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

draftSchema.pre('validate', function () {
    const hasSection = Boolean(this.sectionId);
    const hasCourse = Boolean(this.courseId);
    const hasChapter = Boolean(this.chapterId);

    if (this.type === 'section' && (!hasSection || hasCourse || hasChapter)) {
        this.invalidate(
            'sectionId',
            'A section draft must reference only a section'
        );
    }

    if (this.type === 'course' && (!hasCourse || hasSection || hasChapter)) {
        this.invalidate(
            'courseId',
            'A course draft must reference only a course'
        );
    }

    if (this.type === 'chapter' && (!hasChapter || hasSection || hasCourse)) {
        this.invalidate(
            'chapterId',
            'A chapter draft must reference only a chapter'
        );
    }
});

draftSchema.index({ organizationId: 1, type: 1, sectionId: 1, draftOrder: 1 });
draftSchema.index({ organizationId: 1, type: 1, courseId: 1, draftOrder: 1 });
draftSchema.index({ organizationId: 1, type: 1, chapterId: 1, draftOrder: 1 });
draftSchema.index({ organizationId: 1, status: 1 });

const Draft = mongoose.model('Draft', draftSchema);

export default Draft;
