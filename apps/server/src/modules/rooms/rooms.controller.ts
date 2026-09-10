import { Request, Response, NextFunction } from 'express';
import { roomsService } from './rooms.service';
import { ioInstance } from '../../socket';

export class RoomsController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id || (req as any).user?._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const room = await roomsService.createRoom(userId.toString(), req.body);
            res.status(201).json({ success: true, room });
        } catch (err: any) {
            res.status(err.status || 400).json({ success: false, message: err.message || 'Failed to create room' });
        }
    }

    async join(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id || (req as any).user?._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const { roomCode } = req.body;
            const room = await roomsService.joinRoom(roomCode, userId.toString());

            // Real-time broadcast to room socket channel
            if (ioInstance) {
                const normalizedCode = (roomCode || '').trim().toUpperCase();
                const joinedParticipant = room.participants.find(p => p.userId.toString() === userId.toString());
                const plainParticipants = room.participants.map(p => (p.toObject ? p.toObject() : p));
                const plainJoined = joinedParticipant ? (joinedParticipant.toObject ? joinedParticipant.toObject() : joinedParticipant) : null;
                const payload = {
                    participant: plainJoined,
                    participants: plainParticipants,
                    participantCount: room.participants.length
                };
                ioInstance.to(`hosted:${normalizedCode}`).emit('room:participant_joined', payload);
                ioInstance.to(normalizedCode).emit('room:participant_joined', payload);
            }

            res.json({ success: true, room });
        } catch (err: any) {
            res.status(err.status || 400).json({ success: false, message: err.message || 'Failed to join room' });
        }
    }

    async getByCode(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomCode } = req.params;
            const room = await roomsService.getRoomByCode(roomCode);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Room not found' });
            }
            res.json({ success: true, room });
        } catch (err: any) {
            res.status(err.status || 400).json({ success: false, message: err.message || 'Error fetching room' });
        }
    }

    async validateCustomProblem(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = roomsService.validateAndBuildCustomProblem(req.body);
            res.json({ success: true, problem: validated });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async kick(req: Request, res: Response, next: NextFunction) {
        try {
            const hostId = (req as any).user?.id || (req as any).user?._id;
            const { roomCode } = req.params;
            const { targetUserId } = req.body;

            const room = await roomsService.kickParticipant(roomCode, hostId.toString(), targetUserId);

            if (ioInstance) {
                const normalizedCode = (roomCode || '').trim().toUpperCase();
                const plainParticipants = room.participants.map(p => (p.toObject ? p.toObject() : p));
                const payload = {
                    targetUserId,
                    participants: plainParticipants,
                    participantCount: room.participants.length
                };
                ioInstance.to(`hosted:${normalizedCode}`).emit('room:participant_kicked', payload);
                ioInstance.to(normalizedCode).emit('room:participant_kicked', payload);
            }

            res.json({ success: true, room });
        } catch (err: any) {
            next(err);
        }
    }

    async start(req: Request, res: Response, next: NextFunction) {
        try {
            const hostId = (req as any).user?.id || (req as any).user?._id;
            const { roomCode } = req.params;

            const room = await roomsService.startSession(roomCode, hostId.toString());
            res.json({ success: true, room });
        } catch (err: any) {
            next(err);
        }
    }
}

export const roomsController = new RoomsController();
