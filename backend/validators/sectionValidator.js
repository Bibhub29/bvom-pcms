
import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const optionalRequestParts = {
    params: z.any().optional(),
    query: z.any().optional()
};

const sectionFields = {
    name: z.string().trim().min(1, 'Section name is required').max(150),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).optional()
};

const sectionListSchema = z.object({
    body: z.any().optional(),
    params: z.any().optional(),
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        search: z.string().trim().max(100).optional().default('')
    }).strict()
});

const sectionIdSchema = z.object({
    ...optionalRequestParts,
    params: z.object({
        id: objectIdSchema
    }).strict()
});

const createSectionSchema = z.object({
    ...optionalRequestParts,
    body: z.object({
        ...sectionFields,
        order: z.number().int().min(0).optional()
    }).strict()
});

const updateSectionSchema = z.object({
    ...optionalRequestParts,
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        ...sectionFields,
        order: z.number().int().min(0).optional()
    }).strict()
});

const reorderSectionsSchema = z.object({
    ...optionalRequestParts,
    body: z.object({
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
                message: 'Section IDs cannot be duplicated'
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
    sectionListSchema,
    sectionIdSchema,
    createSectionSchema,
    updateSectionSchema,
    reorderSectionsSchema
};
