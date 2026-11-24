import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, required: true, trim: true },
    summary: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('AuditLog', auditLogSchema);
