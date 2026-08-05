import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

export const connectDB = async () => {
    try {
        logger.info(`[MongoDB] URL = ${env.DATABASE_URL}`);
        const conn = await mongoose.connect(env.DATABASE_URL, {
            autoIndex: true, // Build indexes
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info(`[MongoDB] Connected: ${conn.connection.host}`);
        logger.info(`Database Name: ${mongoose.connection.db?.databaseName}`);
        mongoose.connection.on('error', (err) => {
            logger.error(`[MongoDB] connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('[MongoDB] disconnected');
        });

    } catch (error) {
        console.error(error);

        if (error instanceof Error) {
            console.error(error.name);
            console.error(error.message);
            console.error(error.stack);
        }

        process.exit(1);
    }
};
