import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import { socketAuthMiddleware } from './middleware/socketAuth';
import authRoutes from './routes/auth';
import problemRoutes from './routes/problems';
import matchRoutes from './routes/matches';
import leaderboardRoutes from './routes/leaderboard';
import tournamentRoutes from './routes/tournaments';
import { battleService } from './services/battle';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tournaments', tournamentRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Battle Arena Backend is running' });
});

// Real-time Battle Engine
io.use(socketAuthMiddleware);
battleService.initialize(io);

io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id, 'User:', socket.user?.username);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
