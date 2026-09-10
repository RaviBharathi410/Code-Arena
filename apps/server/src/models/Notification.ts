import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'match' | 'rank' | 'challenge' | 'tournament' | 'system';
    read: boolean;
    data?: Record<string, any>;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['match', 'rank', 'challenge', 'tournament', 'system'], 
        default: 'system' 
    },
    read: { type: Boolean, default: false, index: true },
    data: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
