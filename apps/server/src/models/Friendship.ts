import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
    requesterId: mongoose.Types.ObjectId;
    recipientId: mongoose.Types.ObjectId;
    status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
    createdAt: Date;
    updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>({
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'BLOCKED'], default: 'PENDING', index: true },
}, { timestamps: true });

// Compound index to ensure uniqueness per pair direction
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export const Friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema);
