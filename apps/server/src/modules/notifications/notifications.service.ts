import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

export class NotificationsService {
    async createNotification(data: {
        userId: string | mongoose.Types.ObjectId;
        title: string;
        message: string;
        type?: 'match' | 'rank' | 'challenge' | 'tournament' | 'system';
        data?: Record<string, any>;
    }) {
        return Notification.create({
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || 'system',
            read: false,
            data: data.data || {}
        });
    }

    async getUserNotifications(userId: string, limit = 20) {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            Notification.countDocuments({ userId, read: false })
        ]);

        return {
            notifications,
            unreadCount
        };
    }

    async markAsRead(userId: string, notificationIds?: string[]) {
        const filter: any = { userId };
        if (notificationIds && notificationIds.length > 0) {
            filter._id = { $in: notificationIds };
        }
        await Notification.updateMany(filter, { $set: { read: true } });
        return { success: true };
    }
}

export const notificationsService = new NotificationsService();
