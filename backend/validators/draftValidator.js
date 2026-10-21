import { z } from 'zod';
import { objectIdSchema } from './commonValidator.js';

const draftStatusSchema = z.enum([
    'pending',
    'in-progress',
    'approved',
    'published',
    'rejected'
]);

const draftTypeSchema = z.enum([
    'section',
    'course',
    'chapter'
]);

const draftFields = {
    draftName: z.string()
        .trim()
        .min(1, 'Draft name is required')
        .max(200),

    draftOrder: z.number()
        .int()
        .min(1, 'Draft order must be a positive integer')
        .optional(),

    content: z.string()
        .max(500000)
        .optional(),

    commonDraft: z.string()
        .max(500000)
        .optional(),

    customDraft: z.string()
        .max(500000)
        .optional(),

    status: draftStatusSchema.optional()
};

const sectionDraftBodySchema = z.object({
    draftName: draftFields.draftName.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    draftOrder: draftFields.draftOrder,
    content: draftFields.content,
    commonDraft: draftFields.commonDraft,
    customDraft: draftFields.customDraft,
    status: draftFields.status
}).strict().transform((body) => {
    const draftName = body.draftName ?? body.name;

    return {
        ...body,
        draftName
    };
}).refine(
    (body) => Boolean(body.draftName),
    {
        message: 'Draft name is required',
        path: ['draftName']
    }
);

const courseChapterDraftBodySchema = z.object({
    type: draftTypeSchema,
    sectionId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    chapterId: objectIdSchema.optional(),
    draftName: draftFields.draftName,
    draftOrder: draftFields.draftOrder,
    content: draftFields.content,
    commonDraft: draftFields.commonDraft,
    customDraft: draftFields.customDraft,
    status: draftFields.status
}).strict().superRefine((body, context) => {
    if (body.type === 'section') {
        if (!body.sectionId || body.courseId || body.chapterId) {
            context.addIssue({
                code: 'custom',
                path: ['sectionId'],
                message: 'A section draft must reference only a section'
            });
        }
    }

    if (body.type === 'course') {
        if (!body.courseId || body.sectionId || body.chapterId) {
            context.addIssue({
                code: 'custom',
                path: ['courseId'],
                message: 'A course draft must reference only a course'
            });
        }
    }

    if (body.type === 'chapter') {
        if (!body.chapterId || body.sectionId || body.courseId) {
            context.addIssue({
                code: 'custom',
                path: ['chapterId'],
                message: 'A chapter draft must reference only a chapter'
            });
        }
    }
});

const draftListSchema = z.object({
    params: z.object({}).passthrough(),
    body: z.any().optional(),
    query: z.object({
        type: draftTypeSchema.optional(),
        sectionId: objectIdSchema.optional(),
        courseId: objectIdSchema.optional(),
        chapterId: objectIdSchema.optional(),
        status: draftStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const draftIdSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.any().optional()
});

const createDraftSchema = z.object({
    params: z.object({}).strict(),
    body: courseChapterDraftBodySchema,
    query: z.any().optional()
});

const updateDraftSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        draftName: draftFields.draftName.optional(),
        draftOrder: draftFields.draftOrder,
        content: draftFields.content,
        commonDraft: draftFields.commonDraft,
        customDraft: draftFields.customDraft
    }).strict().refine(
        (body) => Object.keys(body).length > 0,
        'Provide at least one field to update'
    ),
    query: z.any().optional()
});

const updateDraftStatusSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }).strict(),
    body: z.object({
        status: draftStatusSchema
    }).strict(),
    query: z.any().optional()
});

const reorderDraftsSchema = z.object({
    params: z.object({}).strict(),
    body: z.object({
        type: draftTypeSchema,
        parentId: objectIdSchema,
        items: z.array(
            z.object({
                id: objectIdSchema,
                order: z.number().int().min(1)
            }).strict()
        ).min(1).max(1000)
    }).strict().superRefine((body, context) => {
        const ids = body.items.map((item) => item.id);
        const orders = body.items.map((item) => item.order);

        if (new Set(ids).size !== ids.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Duplicate draft IDs are not allowed'
            });
        }

        if (new Set(orders).size !== orders.length) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Duplicate order values are not allowed'
            });
        }

        const sortedOrders = [...orders].sort((a, b) => a - b);

        if (sortedOrders.some((order, index) => order !== index + 1)) {
            context.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Draft order must be consecutive, starting at 1'
            });
        }
    }),
    query: z.any().optional()
});

const bulkImportDraftsSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    body: z.object({
        drafts: z.array(
            z.object({
                draftName: draftFields.draftName,
                draftOrder: draftFields.draftOrder,
                commonDraft: draftFields.commonDraft,
                customDraft: draftFields.customDraft,
                status: draftFields.status
            }).strict()
        ).min(1).max(500)
    }).strict().superRefine((body, context) => {
        const names = body.drafts.map(
            (draft) => draft.draftName.toLowerCase()
        );

        const orders = body.drafts
            .map((draft) => draft.draftOrder)
            .filter((order) => order !== undefined);

        if (new Set(names).size !== names.length) {
            context.addIssue({
                code: 'custom',
                path: ['drafts'],
                message: 'Duplicate draft names are not allowed'
            });
        }

        if (new Set(orders).size !== orders.length) {
            context.addIssue({
                code: 'custom',
                path: ['drafts'],
                message: 'Duplicate draft orders are not allowed'
            });
        }
    }),
    query: z.any().optional()
});

const sectionDraftParamsSchema = z.object({
    params: z.object({
        sectionId: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.object({
        status: draftStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const courseDraftParamsSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.object({
        status: draftStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const chapterDraftParamsSchema = z.object({
    params: z.object({
        chapterId: objectIdSchema
    }).strict(),
    body: z.any().optional(),
    query: z.object({
        status: draftStatusSchema.optional(),
        search: z.string().trim().max(100).optional().default(''),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }).strict()
});

const sectionDraftCreateSchema = z.object({
    params: z.object({
        sectionId: objectIdSchema
    }).strict(),
    body: sectionDraftBodySchema,
    query: z.any().optional()
});

const courseDraftCreateSchema = z.object({
    params: z.object({
        courseId: objectIdSchema
    }).strict(),
    body: z.object({
        draftName: draftFields.draftName,
        draftOrder: draftFields.draftOrder,
        commonDraft: draftFields.commonDraft,
        customDraft: draftFields.customDraft,
        status: draftFields.status
    }).strict(),
    query: z.any().optional()
});

const chapterDraftCreateSchema = z.object({
    params: z.object({
        chapterId: objectIdSchema
    }).strict(),
    body: z.object({
        draftName: draftFields.draftName,
        draftOrder: draftFields.draftOrder,
        content: draftFields.content,
        commonDraft: draftFields.commonDraft,
        customDraft: draftFields.customDraft,
        status: draftFields.status
    }).strict(),
    query: z.any().optional()
});

export {
    draftListSchema,
    draftIdSchema,
    createDraftSchema,
    updateDraftSchema,
    updateDraftStatusSchema,
    reorderDraftsSchema,
    bulkImportDraftsSchema,
    sectionDraftParamsSchema,
    courseDraftParamsSchema,
    chapterDraftParamsSchema,
    sectionDraftCreateSchema,
    courseDraftCreateSchema,
    chapterDraftCreateSchema
};