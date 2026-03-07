import './config/env';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { setupSocket } from './socket';
import { config } from './config';

const startServer = () => {
    const app = createApp();
    const httpServer = createServer(app);

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    setupSocket(io);

    httpServer.listen(config.port, '0.0.0.0', () => {
        console.log(`[ARENA] Intelligence Uplink established on port ${config.port}`);
        console.log(`[ARENA] Mode: ${config.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    });
};

startServer();
