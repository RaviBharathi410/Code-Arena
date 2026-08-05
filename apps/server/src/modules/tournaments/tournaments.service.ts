import { Tournament } from '../../models/Tournament';
import { TournamentParticipant } from '../../models/TournamentParticipant';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';

// ── AppError helper (matches existing pattern) ─────────────────────────────
class AppError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}

export interface TournamentFilters {
    status?: string;
    page?: number;
    limit?: number;
}

export class TournamentsService {

    /**
     * List tournaments with optional status filter, pagination, and participant count.
     */
    async getAllTournaments(filters: TournamentFilters = {}) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(filters.limit || 20, 100);
        const offset = (page - 1) * limit;

        const baseCondition: any = {};
        if (filters.status) baseCondition.status = filters.status;

        const total = await Tournament.countDocuments(baseCondition);

        const tournamentsList = await Tournament.find(baseCondition)
            .sort({ startsAt: 1 })
            .limit(limit)
            .skip(offset)
            .lean();

        // Get participant counts
        const data = await Promise.all(tournamentsList.map(async (t) => {
            const count = await TournamentParticipant.countDocuments({ tournamentId: t._id });
            return { ...t, id: t._id, participantCount: count };
        }));

        const totalPages = Math.ceil(Number(total) / limit);

        return {
            data,
            pagination: { page, limit, total: Number(total), totalPages },
        };
    }

    /**
     * Get a single tournament by ID including full participants list.
     */
    async getTournamentById(id: string) {
        const tournament = await Tournament.findById(id).lean();

        if (!tournament) {
            throw new AppError('Tournament not found', 404);
        }

        const count = await TournamentParticipant.countDocuments({ tournamentId: id });
        const tournamentWithCount = { ...tournament, id: tournament._id, participantCount: count };

        // Fetch participants with user info
        const participantsDocs = await TournamentParticipant.find({ tournamentId: id })
            .sort({ seed: 1 })
            .populate('userId', 'username eloRating rankRating')
            .lean();

        const participants = participantsDocs.map((p: any) => ({
            id: p._id,
            userId: p.userId?._id,
            seed: p.seed,
            status: p.status,
            joinedAt: p.joinedAt,
            username: p.userId?.username,
            eloRating: p.userId?.eloRating,
            rankRating: p.userId?.rankRating,
        }));

        return { ...tournamentWithCount, participants };
    }

    /**
     * Create a new tournament.
     */
    async createTournament(data: {
        title: string;
        description?: string;
        status?: string;
        format?: string;
        maxParticipants?: number;
        entryFee?: number;
        prizePool?: number;
        startsAt: Date | string;
        endsAt?: Date | string;
        createdBy: string;
    }) {
        const created = await Tournament.create({
            title: data.title,
            description: data.description,
            status: data.status || 'upcoming',
            format: data.format || 'single_elimination',
            maxParticipants: data.maxParticipants || 16,
            entryFee: data.entryFee || 0,
            prizePool: data.prizePool || 0,
            startsAt: new Date(data.startsAt),
            endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
            createdBy: data.createdBy,
        });

        logger.info({ tournamentId: created.id }, '[TOURNAMENTS] Tournament created');
        return created;
    }

    /**
     * Register a user for a tournament.
     */
    async joinTournament(tournamentId: string, userId: string) {
        // Validate: tournament exists and is upcoming
        const tournament = await Tournament.findById(tournamentId).lean();

        if (!tournament) {
            throw new AppError('Tournament not found', 404);
        }
        if (tournament.status !== 'upcoming') {
            throw new AppError('Tournament is not open for registration', 400);
        }

        // Check capacity
        const currentCount = await TournamentParticipant.countDocuments({ tournamentId });

        if (Number(currentCount) >= tournament.maxParticipants) {
            throw new AppError('Tournament is at maximum capacity', 409);
        }

        // Check not already registered
        const existing = await TournamentParticipant.findOne({ tournamentId, userId }).lean();

        if (existing) {
            throw new AppError('Already registered for this tournament', 409);
        }

        const participant = await TournamentParticipant.create({ tournamentId, userId });

        logger.info({ tournamentId, userId }, '[TOURNAMENTS] User joined tournament');
        return participant;
    }

    /**
     * Unregister a user from a tournament.
     */
    async leaveTournament(tournamentId: string, userId: string) {
        const existing = await TournamentParticipant.findOne({ tournamentId, userId }).lean();

        if (!existing) {
            throw new AppError('Registration not found', 404);
        }

        await TournamentParticipant.deleteOne({ tournamentId, userId });

        logger.info({ tournamentId, userId }, '[TOURNAMENTS] User left tournament');
        return { success: true };
    }
}

export const tournamentsService = new TournamentsService();
