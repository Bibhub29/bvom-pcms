
import { z } from 'zod';

const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid resource ID');

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

const searchSchema = z
    .string()
    .trim()
    .max(100, 'Search cannot exceed 100 characters')
    .optional();

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
    .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value;
    }, 'Invalid calendar date');

export {
    objectIdSchema,
    paginationSchema,
    searchSchema,
    dateStringSchema
};
