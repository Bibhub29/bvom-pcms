import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
    const server = app.listen(PORT, () => {
        console.log(`PCMS API running at http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    void connectDB().catch(error => {
        console.error(`MongoDB connection cannot start: ${error.message}`);
    });

    const shutdown = (signal) => {
        console.log(`${signal} received. Closing server...`);
        server.close(async () => {
            const mongoose = await import('mongoose');
            await mongoose.default.disconnect();
            process.exit(0);
        });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
