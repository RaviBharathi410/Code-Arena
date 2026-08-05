import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAuditLog extends Document {
    adminId: mongoose.Types.ObjectId;
    action: string;
    targetUserId?: mongoose.Types.ObjectId;
    metadata?: any;
    createdAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>({
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);
