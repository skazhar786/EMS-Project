import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['TASK_ASSIGNED', 'TASK_UPDATED', 'ANNOUNCEMENT', 'LEAVE', 'SALARY', 'GENERAL'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'GENERAL' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    link: { type: String, trim: true, default: '' }, // in-app path such as /employee/tasks
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    announcement: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' }, // lets an admin retract one
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ announcement: 1 });

export default mongoose.model('Notification', notificationSchema);
