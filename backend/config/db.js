import mongoose from 'mongoose';

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing from environment variables');
    }

    let attempt = 0;
    while (mongoose.connection.readyState !== 1) {
        attempt += 1;
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
                maxPoolSize: 10,
                minPoolSize: 0
            });
            console.log(`MongoDB connected: ${mongoose.connection.host}`);
        } catch (error) {
            const delayMs = Math.min(30000, 2000 * (2 ** Math.min(attempt - 1, 4)));
            console.warn(`MongoDB connection attempt ${attempt} failed. Retrying in ${Math.round(delayMs / 1000)}s.`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    mongoose.connection.on('disconnected', () => console.warn('MongoDB connection lost; waiting for the driver to reconnect.'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB connection restored.'));
};

export default connectDB;
