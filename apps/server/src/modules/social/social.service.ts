import { Friendship } from '../../models/Friendship';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';

export class SocialService {
    async sendFriendRequest(requesterId: string, recipientId: string) {
        if (requesterId === recipientId) {
            throw new Error('Cannot send friend request to yourself');
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            throw new Error('User not found');
        }

        const existing = await Friendship.findOne({
            $or: [
                { requesterId, recipientId },
                { requesterId: recipientId, recipientId: requesterId }
            ]
        });

        if (existing) {
            throw new Error(`Friendship or request already exists (status: ${existing.status})`);
        }

        const friendship = await Friendship.create({
            requesterId,
            recipientId,
            status: 'PENDING'
        });

        logger.info({ requesterId, recipientId }, '[SOCIAL] Friend request sent');
        return friendship;
    }

    async respondToFriendRequest(userId: string, requestId: string, accept: boolean) {
        const friendship = await Friendship.findById(requestId);
        if (!friendship) {
            throw new Error('Friend request not found');
        }

        if (friendship.recipientId.toString() !== userId) {
            throw new Error('Not authorized to respond to this request');
        }

        if (accept) {
            friendship.status = 'ACCEPTED';
            await friendship.save();
            logger.info({ friendshipId: requestId, userId }, '[SOCIAL] Friend request accepted');
            return friendship;
        } else {
            await Friendship.findByIdAndDelete(requestId);
            logger.info({ friendshipId: requestId, userId }, '[SOCIAL] Friend request rejected');
            return { message: 'Friend request rejected' };
        }
    }

    async listFriends(userId: string) {
        const friendships = await Friendship.find({
            $or: [
                { requesterId: userId, status: 'ACCEPTED' },
                { recipientId: userId, status: 'ACCEPTED' }
            ]
        }).populate('requesterId recipientId', 'username avatarUrl rankRating tier isOnline');

        return friendships.map(f => {
            const friendDoc: any = f.requesterId._id.toString() === userId ? f.recipientId : f.requesterId;
            return {
                friendshipId: f._id,
                friend: friendDoc,
                since: f.updatedAt
            };
        });
    }

    async listPendingRequests(userId: string) {
        const pending = await Friendship.find({
            recipientId: userId,
            status: 'PENDING'
        }).populate('requesterId', 'username avatarUrl rankRating tier');

        return pending.map(p => ({
            requestId: p._id,
            requester: p.requesterId,
            createdAt: p.createdAt
        }));
    }
}

export const socialService = new SocialService();
