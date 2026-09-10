import { Team } from '../../models/Team';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';

export class TeamService {
    async createTeam(leaderId: string, name: string, tag: string, description?: string) {
        const existing = await Team.findOne({ $or: [{ name }, { tag: tag.toUpperCase() }] });
        if (existing) {
            throw new Error('Team name or tag already taken');
        }

        const team = await Team.create({
            name,
            tag: tag.toUpperCase(),
            description,
            leaderId,
            members: [leaderId],
        });

        logger.info({ teamId: team._id, leaderId }, '[TEAM] Team created');
        return team;
    }

    async addMember(teamId: string, leaderId: string, memberId: string) {
        const team = await Team.findById(teamId);
        if (!team) throw new Error('Team not found');

        if (team.leaderId.toString() !== leaderId) {
            throw new Error('Only team leader can add members');
        }

        if (team.members.map(m => m.toString()).includes(memberId)) {
            throw new Error('User is already a team member');
        }

        team.members.push(memberId as any);
        await team.save();
        return team;
    }

    async getTeamDetails(teamId: string) {
        const team = await Team.findById(teamId).populate('members leaderId', 'username avatarUrl rankRating tier');
        if (!team) throw new Error('Team not found');
        return team;
    }

    async getLeaderboard(limit = 20) {
        return Team.find()
            .sort({ eloRating: -1 })
            .limit(limit)
            .populate('leaderId', 'username avatarUrl')
            .lean();
    }
}

export const teamService = new TeamService();
