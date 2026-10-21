
import { ZodError } from 'zod';

const validate = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.parse({
                body: req.body,
                params: req.params,
                query: req.query
            });

            if (result.body !== undefined) {
                req.body = result.body;
            }

            if (result.params !== undefined) {
                req.params = result.params;
            }

            if (result.query !== undefined) {
                req.validatedQuery = result.query;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Request validation failed',
                    errors: error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message
                    }))
                });
            }

            next(error);
        }
    };
};

export default validate;
