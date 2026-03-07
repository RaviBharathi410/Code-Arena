import { db } from '../../db';
import { tournaments } from '@arena/database';
import { eq, desc } from 'drizzle-orm';

export class TournamentsService {
    async getAllTournaments() {
        return db
            .select()
            .from(tournaments)
            .orderBy(desc(tournaments.createdAt))
            .all();
    }

    async getTournamentById(id: string) {
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).get();
        if (!tournament) {
            throw new Error('Tournament not found');
        }
        return tournament;
    }
}

export const tournamentsService = new TournamentsService();
