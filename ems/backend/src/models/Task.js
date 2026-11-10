import mongoose from 'mongoose';
import './Employee.js'; // registers the Employee model for populate()

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// Each assignee tracks their own progress, so one person finishing does not complete it for everyone.
const assigneeSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'Pending' },
    completedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: TASK_STATUSES, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 3, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    assignees: {
      type: [assigneeSchema],
      validate: [(v) => v.length > 0, 'A task must be assigned to at least one employee'],
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'Medium' },
    deadline: { type: Date, required: [true, 'Deadline is required'] },
    // Overall status, derived from the assignees. "Overdue" is NOT stored: it is calculated at read time.
    status: { type: String, enum: TASK_STATUSES, default: 'Pending' },
    completedAt: { type: Date },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

taskSchema.index({ 'assignees.employee': 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ deadline: 1 });

// Call after changing assignees' statuses.
taskSchema.methods.recomputeStatus = function () {
  const states = this.assignees.map((a) => a.status);
  if (states.length > 0 && states.every((s) => s === 'Completed')) {
    this.status = 'Completed';
    this.completedAt = this.completedAt || new Date();
  } else {
    this.status = states.some((s) => s !== 'Pending') ? 'In Progress' : 'Pending';
    this.completedAt = undefined;
  }
};

export default mongoose.model('Task', taskSchema);
