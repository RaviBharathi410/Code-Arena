import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socketAuth.middleware';
import { BattleHandler } from './battle.handler';

export const setupSocket = (io: Server) => {
    io.use(socketAuthMiddleware);
    const battleHandler = new BattleHandler(io);

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        battleHandler.handleConnection(socket);
    });
};
