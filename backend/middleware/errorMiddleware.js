
import { ZodError } from 'zod';

const notFound = (req, res, next) => {
    const error = new Error(
        `Route not found: ${req.method} ${req.originalUrl}`
    );

    error.statusCode = 404;
    next(error);
};

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errors;

    if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Request validation failed';
        errors = err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
    } else if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON request body';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Database validation failed';
        errors = Object.values(err.errors).map((item) => ({
            field: item.path,
            message: item.message
        }));
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid resource ID';
    } else if (/Mongo.*(Network|ServerSelection|Timeout|Topology)|MongooseServerSelection/.test(err.name || '')) {
        statusCode = 503;
        message = 'Database connection is temporarily unavailable. Please retry shortly.';
    } else if (err.code === 11000) {
        statusCode = 409;
        message = 'A record with this value already exists';
    }

    if (statusCode >= 500) {
        console.error(err);
        message = 'Internal server error';
    }

    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    if (
        process.env.NODE_ENV === 'development' &&
        statusCode >= 500
    ) {
        response.details = err.message;
    }

    return res.status(statusCode).json(response);
};


export { notFound, errorHandler };
