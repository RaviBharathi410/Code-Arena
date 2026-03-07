import { Request, Response } from 'express';
import { tournamentsService } from './tournaments.service';

export class TournamentsController {
    async getAllTournaments(req: Request, res: Response) {
        try {
            const result = await tournamentsService.getAllTournaments();
            res.json(result);
        } catch (err: any) {
            console.error('Error fetching tournaments:', err);
            res.status(500).json({ message: 'Error fetching tournaments' });
        }
    }

    async getTournamentById(req: Request, res: Response) {
        try {
            const tournament = await tournamentsService.getTournamentById(req.params.id);
            res.json(tournament);
        } catch (err: any) {
            console.error('Error fetching tournament:', err);
            if (err.message === 'Tournament not found') {
                return res.status(404).json({ message: 'Tournament not found' });
            }
            res.status(500).json({ message: 'Error fetching tournament' });
        }
    }
}

export const tournamentsController = new TournamentsController();
