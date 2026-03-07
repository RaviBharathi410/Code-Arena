import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'body.password', 'body.token'],
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty' }  // Human-readable in dev only
    }),
});
