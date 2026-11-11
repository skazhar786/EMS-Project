import mongoose from 'mongoose';
import './Employee.js'; // registers the Employee model for populate()

export const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid'];
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: LEAVE_TYPES, required: [true, 'Leave type is required'] },
    // Calendar dates stored at UTC midnight (same convention as attendance).
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Working days only: weekly-off days inside the range are not counted.
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: [true, 'Reason is required'], trim: true, minlength: 5, maxlength: 500 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'Pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    remarks: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('Leave', leaveSchema);
