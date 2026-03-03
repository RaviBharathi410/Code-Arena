import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface CustomSocket extends Socket {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; username: string };
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
};
