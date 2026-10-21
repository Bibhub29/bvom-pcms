
import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
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
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
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

sectionSchema.pre('validate', function () {
    if (this.name) {
        this.nameKey = this.name.trim().toLowerCase();
    }
});

sectionSchema.index(
    { organizationId: 1, nameKey: 1 },
    { unique: true }
);

sectionSchema.index({ organizationId: 1, order: 1 });

const Section = mongoose.model('Section', sectionSchema);

export default Section;
