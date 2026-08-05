import { Request, Response, NextFunction } from 'express';
import { tournamentsService } from './tournaments.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class TournamentsController {

    async getAllTournaments(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, page, limit } = req.query;
            const result = await tournamentsService.getAllTournaments({
                status: status as string | undefined,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
            });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async getTournamentById(req: Request, res: Response, next: NextFunction) {
        try {
            const tournament = await tournamentsService.getTournamentById(req.params.id);
            res.json(tournament);
        } catch (err) {
            next(err);
        }
    }

    async createTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tournament = await tournamentsService.createTournament({
                ...req.body,
                createdBy: req.user!.id,
            });
            res.status(201).json(tournament);
        } catch (err) {
            next(err);
        }
    }

    async joinTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const participant = await tournamentsService.joinTournament(
                req.params.id,
                req.user!.id
            );
            res.status(201).json(participant);
        } catch (err) {
            next(err);
        }
    }

    async leaveTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await tournamentsService.leaveTournament(
                req.params.id,
                req.user!.id
            );
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

export const tournamentsController = new TournamentsController();
