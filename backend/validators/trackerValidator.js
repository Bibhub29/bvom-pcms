import { z } from 'zod';
import {
    objectIdSchema,
    dateStringSchema
} from './commonValidator.js';

const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

const taskStatusSchema = z.enum(['pending', 'completed']);

const taskFields = {
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(3000).optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    isCompleted: z.boolean().optional()
};

const taskListSchema = z.object({
    params: z.object({}).strict(),
    body: z.any().optional(),
    query: z.object({
        status: taskStatusSchema.optional(),
        priority: taskPrioritySchema.optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const createTaskSchema = z.object({
    params: z.object({}).strict(),
    body: z.object({
        title: taskFields.title,
        description: taskFields.description,
        priority: taskFields.priority,
        dueDate: taskFields.dueDate,
        isCompleted: taskFields.isCompleted
    }).strict(),
    query: z.any().optional()
});

const taskIdSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.any().optional()
});

const updateTaskSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        title: taskFields.title.optional(),
        description: taskFields.description,
        priority: taskFields.priority,
        dueDate: taskFields.dueDate,
        isCompleted: taskFields.isCompleted
    }).strict().refine(
        (body) => Object.keys(body).length > 0,
        'Provide at least one field to update'
    ),
    query: z.any().optional()
});

const taskCompletionSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        isCompleted: z.boolean()
    }).strict(),
    query: z.any().optional()
});

const courseProgressSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    body: z.object({
        completedChapterIds: z.array(objectIdSchema).max(1000)
    }).strict().superRefine((body, context) => {
        if (
            new Set(body.completedChapterIds).size !==
            body.completedChapterIds.length
        ) {
            context.addIssue({
                code: 'custom',
                path: ['completedChapterIds'],
                message: 'Duplicate chapter IDs are not allowed'
            });
        }
    }),
    query: z.any().optional()
});

const activityListSchema = z.object({
    params: z.object({}).strict(),
    body: z.any().optional(),
    query: z.object({
        year: z.coerce.number().int().min(2000).max(2100),
        month: z.coerce.number().int().min(1).max(12).optional()
    }).strict()
});

const activityDateSchema = z.object({
    params: z.object({
        date: dateStringSchema
    }).strict(),
    body: z.object({
        minutesSpent: z.number().int().min(0).max(1440),
        tasksCompleted: z.number().int().min(0).max(10000),
        chaptersCompleted: z.number().int().min(0).max(10000),
        attended: z.boolean(),
        note: z.string().trim().max(2000).optional()
    }).strict(),
    query: z.any().optional()
});

const attendanceSchema = z.object({
    params: z.object({}).strict(),
    body: z.any().optional(),
    query: z.object({
        months: z.coerce.number().int().min(1).max(24).default(6)
    }).strict()
});

export {
    taskListSchema,
    createTaskSchema,
    taskIdSchema,
    updateTaskSchema,
    taskCompletionSchema,
    courseProgressSchema,
    activityListSchema,
    activityDateSchema,
    attendanceSchema
};
