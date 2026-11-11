import mongoose from 'mongoose';

export const ENTITY_TYPES = ['Employee', 'Department', 'Task', 'Attendance', 'Leave', 'Payroll', 'Announcement'];

// Append-only audit trail of important actions.
const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' }, // stored as text so it survives deleted accounts
    actorRole: { type: String, enum: ['ADMIN', 'EMPLOYEE'] },
    action: { type: String, required: true }, // e.g. EMPLOYEE_CREATED
    entityType: { type: String, enum: ENTITY_TYPES, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });
// Old entries are removed automatically after one year.
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export default mongoose.model('ActivityLog', activityLogSchema);
