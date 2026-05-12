
export class TournamentsService {
    async getAllTournaments() {
        // Placeholder until tournaments table is added to schema
        return [];
    }

    async getTournamentById(id: string) {
        throw new Error('Tournament feature offline');
    }
}

export const tournamentsService = new TournamentsService();
