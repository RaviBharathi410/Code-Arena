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

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as { sub: string; username: string };
        socket.user = {
            id: decoded.sub,
            username: decoded.username
        };
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
};
