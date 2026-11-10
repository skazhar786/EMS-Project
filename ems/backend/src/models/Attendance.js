import mongoose from 'mongoose';
import './Employee.js'; // registers the Employee model for populate()

export const ATTENDANCE_STATUSES = ['Present', 'Late', 'Half-day', 'Absent'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    // The office-calendar day, stored at UTC midnight (e.g. 2026-11-10T00:00:00Z).
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    workHours: { type: Number, default: 0, min: 0 },
    // Set when an administrator created or corrected the record by hand.
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One record per employee per day: this is what blocks duplicate check-ins.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
