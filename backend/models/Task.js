
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
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
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: 200,
            validate: {
                validator: (value) => value.trim().length > 0,
                message: 'Task title cannot be empty'
            }
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: 3000
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        dueDate: {
            type: Date,
            default: null
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

taskSchema.index({ userId: 1, isCompleted: 1, dueDate: 1 });
taskSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
