import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 3, maxlength: 120 },
    message: { type: String, required: [true, 'Message is required'], trim: true, minlength: 3, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, // null = everyone
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
