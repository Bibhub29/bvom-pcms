import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import sectionDraftRoutes from './routes/sectionDraftRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import courseDraftRoutes from './routes/courseDraftRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import courseChapterRoutes from './routes/courseChapterRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import trackerRoutes from './routes/trackerRoutes.js';

import {
    notFound,
    errorHandler
} from './middleware/errorMiddleware.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

app.use('/api', limiter);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'PCMS API is running',
        api: '/api',
        health: '/api/health'
    });
});

app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'PCMS API is running',
        health: '/api/health'
    });
});

app.get('/api/health', (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    res.status(databaseConnected ? 200 : 503).json({
        success: databaseConnected,
        message: databaseConnected ? 'PCMS API and database are ready' : 'PCMS API is running; database is disconnected',
        database: databaseConnected ? 'connected' : 'disconnected'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/sections/:sectionId/drafts', sectionDraftRoutes);

app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/drafts', courseDraftRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/courses/:courseId/chapters', courseChapterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/tracker', trackerRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
