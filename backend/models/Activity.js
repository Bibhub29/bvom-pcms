
import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        date: {
            type: String,
            required: [true, 'Activity date is required'],
            match: [
                /^\d{4}-\d{2}-\d{2}$/,
                'Date must use YYYY-MM-DD format'
            ]
        },
        minutesSpent: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Minutes spent must be an integer'
            }
        },
        tasksCompleted: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Completed task count must be an integer'
            }
        },
        chaptersCompleted: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Completed chapter count must be an integer'
            }
        },
        attended: {
            type: Boolean,
            default: false
        },
        note: {
            type: String,
            trim: true,
            default: '',
            maxlength: 1000
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

activitySchema.index(
    { userId: 1, date: 1 },
    { unique: true }
);

activitySchema.index({ organizationId: 1, date: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
