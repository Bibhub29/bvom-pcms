
import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const optionalRequestParts = {
    params: z.any().optional(),
    query: z.any().optional()
};

const iconUrlSchema = z.union([
    z.literal(''),
    z.string().trim().url().max(2048).refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
    }, 'Icon URL must use HTTP or HTTPS')
]);

const courseFields = {
    name: z.string().trim().min(1, 'Course name is required').max(150),
    description: z.string().trim().max(2000).optional(),
    iconUrl: iconUrlSchema.optional(),
    commonDraft: z.string().max(100000).optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).optional()
};

const courseListSchema = z.object({
    body: z.any().optional(),
    params: z.any().optional(),
    query: z.object({
        sectionId: objectIdSchema.optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().trim().max(100).optional().default('')
    }).strict()
});

const courseIdSchema = z.object({
    ...optionalRequestParts,
    params: z.object({
        id: objectIdSchema
    }).strict()
});

const createCourseSchema = z.object({
    ...optionalRequestParts,
    body: z.object({
        ...courseFields,
        sectionId: objectIdSchema,
        order: z.number().int().min(0).optional()
    }).strict()
});

const updateCourseSchema = z.object({
    ...optionalRequestParts,
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        ...courseFields,
        sectionId: objectIdSchema.optional(),
        order: z.number().int().min(0).optional()
    }).strict()
});

const reorderCoursesSchema = z.object({
    ...optionalRequestParts,
    body: z.object({
        sectionId: objectIdSchema,
        items: z.array(
            z.object({
                id: objectIdSchema,
                order: z.number().int().min(0)
            }).strict()
        ).min(1).max(500)
    }).strict().superRefine((body, context) => {
        const ids = body.items.map((item) => item.id);
        const orders = body.items.map((item) => item.order);

        if (new Set(ids).size !== ids.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Course IDs cannot be duplicated'
            });
        }

        if (new Set(orders).size !== orders.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Order values cannot be duplicated'
            });
        }

        const sortedOrders = [...orders].sort((a, b) => a - b);

        if (sortedOrders.some((order, index) => order !== index)) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Order values must start at 0 and be consecutive'
            });
        }
    })
});

export {
    courseListSchema,
    courseIdSchema,
    createCourseSchema,
    updateCourseSchema,
    reorderCoursesSchema
};
