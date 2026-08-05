import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface CustomSocket extends Socket {
    user?: {
        id: string;
        username: string;
    };
}



export const socketAuthMiddleware = (socket: CustomSocket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    // Since this is a middleware array, we must handle async operations correctly
    (async () => {
        try {
            const payload = jwt.verify(token, config.jwtSecret) as any;
            socket.user = {
                id: payload.sub,
                username: payload.username || 'operator'
            };
            next();
        } catch (err: any) {
            next(new Error('Authentication error: Invalid token'));
        }
    })();
};
