
import { z } from 'zod';

const loginSchema = z.object({
    body: z.object({
        organizationCode: z
            .string()
            .trim()
            .min(2, 'Organization code is required')
            .max(50)
            .transform((value) => value.toUpperCase()),
        email: z
            .string()
            .trim()
            .email('Enter a valid email address')
            .max(254)
            .transform((value) => value.toLowerCase()),
        password: z
            .string()
            .min(1, 'Password is required')
            .max(128)
    }).strict()
});

const validateOrganizationSchema = z.object({
    query: z.object({
        code: z
            .string()
            .trim()
            .min(2, 'Organization code is required')
            .max(50)
            .transform((value) => value.toUpperCase())
    }).strict()
});

export {
    loginSchema,
    validateOrganizationSchema
};
