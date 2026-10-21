import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const dashboardSectionsSchema = z.object({
    params: z.object({}).strict(),
    body: z.any().optional(),
    query: z.object({
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const noticeIdSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.any().optional()
});

const createNoticeSchema = z.object({
    params: z.object({}).strict(),
    query: z.any().optional(),
    body: z.object({
        title: z.string().trim().min(1).max(200),
        message: z.string().trim().min(1).max(2000),
        type: z.enum(['Update', 'Reminder', 'Tip', 'Alert']).default('Update')
    }).strict()
});

export {
    dashboardSectionsSchema,
    noticeIdSchema,
    createNoticeSchema
};
