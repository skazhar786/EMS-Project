import mongoose from 'mongoose';
import './Department.js'; // registers the Department model so populate('department') works

export const GENDERS = ['Male', 'Female', 'Other'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];
export const EMPLOYEE_STATUS = ['Active', 'Inactive'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true }, // e.g. EMP-0001
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    fullName: { type: String, required: [true, 'Full name is required'], trim: true, minlength: 2, maxlength: 100 },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,15}$/, 'Please provide a valid phone number'],
    },
    profilePicture: { type: String, default: '' },
    gender: { type: String, enum: GENDERS },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true, maxlength: 300, default: '' },

    joiningDate: { type: Date, required: [true, 'Joining date is required'], default: Date.now },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: String, trim: true, maxlength: 100, default: '' },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'Full-time' },
    status: { type: String, enum: EMPLOYEE_STATUS, default: 'Active' },
    basicSalary: { type: Number, min: [0, 'Salary cannot be negative'], default: 0 },

    // Remaining days. Only changed when a leave is APPROVED (Phase 6).
    leaveBalance: {
      casual: { type: Number, default: 12, min: 0 },
      sick: { type: Number, default: 10, min: 0 },
      earned: { type: Number, default: 15, min: 0 },
    },

    // Marks development sample data so it is never confused with real records.
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ fullName: 1 });

export default mongoose.model('Employee', employeeSchema);
