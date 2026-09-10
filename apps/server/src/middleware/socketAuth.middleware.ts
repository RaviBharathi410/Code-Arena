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
        console.log("[Socket Auth] Received token:", token ? `${token.substring(0, 10)}...` : 'undefined');
        try {
            const payload = jwt.verify(token, config.jwtSecret) as any;
            console.log("[Socket Auth] Payload verified for user:", payload.sub);
            
            socket.user = {
                id: payload.sub,
                username: payload.username || 'operator'
            };

            // Enforce token expiration on the socket connection
            if (payload.exp) {
                const msUntilExpiry = (payload.exp * 1000) - Date.now();
                if (msUntilExpiry > 0) {
                    setTimeout(() => {
                        socket.emit('auth:expired', { message: 'Session expired' });
                        socket.disconnect(true);
                    }, msUntilExpiry);
                }
            }

            next();
        } catch (err: any) {
            console.error("[Socket Auth] Token verification failed:", err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    })();
};
