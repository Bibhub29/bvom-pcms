
import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const chapterStatusSchema = z.enum([
    'Pending',
    'Updated',
    'Published'
]);

const chatLinkSchema = z.string()
    .trim()
    .max(2048)
    .refine((value) => {
        if (value === '') {
            return true;
        }

        try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }, 'Chat link must be a valid HTTP or HTTPS URL');

const chapterFields = {
    name: z.string()
        .trim()
        .min(1, 'Chapter name is required')
        .max(200),
    content: z.string().max(500000).optional(),
    chatLink: chatLinkSchema.optional(),
    order: z.number().int().min(1),
    status: chapterStatusSchema.optional()
};

const chapterListSchema = z.object({
    params: z.object({}).optional(),
    body: z.any().optional(),
    query: z.object({
        courseId: objectIdSchema.optional(),
        status: chapterStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const chapterIdSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    query: z.any().optional(),
    body: z.any().optional()
});

const courseChapterParamsSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    query: z.any().optional(),
    body: z.any().optional()
});

const createChapterSchema = z.object({
    params: z.any().optional(),
    query: z.any().optional(),
    body: z.object({
        courseId: objectIdSchema,
        ...chapterFields
    }).strict()
});

const updateChapterSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    query: z.any().optional(),
    body: z.object({
        courseId: objectIdSchema.optional(),
        name: chapterFields.name.optional(),
        content: chapterFields.content,
        chatLink: chapterFields.chatLink,
        order: chapterFields.order.optional(),
        status: chapterStatusSchema.optional()
    }).strict().refine(
        (body) => Object.keys(body).length > 0,
        'Provide at least one field to update'
    )
});

const updateChapterStatusSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    query: z.any().optional(),
    body: z.object({
        status: chapterStatusSchema
    }).strict()
});

const reorderChaptersSchema = z.object({
    params: z.any().optional(),
    query: z.any().optional(),
    body: z.object({
        courseId: objectIdSchema,
        items: z.array(
            z.object({
                id: objectIdSchema,
                order: z.number().int().min(1)
            }).strict()
        ).min(1).max(500)
    }).strict().superRefine((body, context) => {
        const ids = body.items.map((item) => item.id);
        const orders = body.items.map((item) => item.order);

        if (new Set(ids).size !== ids.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Chapter IDs cannot be duplicated'
            });
        }

        if (new Set(orders).size !== orders.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Chapter order values cannot be duplicated'
            });
        }

        const sorted = [...orders].sort((a, b) => a - b);

        if (sorted.some((order, index) => order !== index + 1)) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Chapter order values must start at 1 and be consecutive'
            });
        }
    })
});

const bulkImportChaptersSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    query: z.any().optional(),
    body: z.object({
        chapters: z.array(
            z.object({
                name: chapterFields.name,
                content: chapterFields.content,
                chatLink: chapterFields.chatLink,
                order: chapterFields.order,
                status: chapterStatusSchema.optional()
            }).strict()
        ).min(1, 'At least one chapter is required')
            .max(500, 'A maximum of 500 chapters can be imported')
    }).strict().superRefine((body, context) => {
        const names = body.chapters.map(
            (chapter) => chapter.name.trim().toLowerCase()
        );
        const orders = body.chapters.map((chapter) => chapter.order);

        if (new Set(names).size !== names.length) {
            context.addIssue({
                code: 'custom',
                path: ['chapters'],
                message: 'Imported chapter names cannot be duplicated'
            });
        }

        if (new Set(orders).size !== orders.length) {
            context.addIssue({
                code: 'custom',
                path: ['chapters'],
                message: 'Imported chapter order values cannot be duplicated'
            });
        }
    })
});

export {
    chapterStatusSchema,
    chapterListSchema,
    chapterIdSchema,
    courseChapterParamsSchema,
    createChapterSchema,
    updateChapterSchema,
    updateChapterStatusSchema,
    reorderChaptersSchema,
    bulkImportChaptersSchema
};


const courseChapterListSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.object({
        status: chapterStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

export { courseChapterListSchema };
