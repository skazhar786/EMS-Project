import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';

// Notifications are a side effect. If creating them fails, the main action
// (assigning a task, etc.) must still succeed, so errors are logged, not thrown.
export const notifyUsers = async (userIds, payload) => {
  try {
    const unique = [...new Set(userIds.filter(Boolean).map(String))];
    if (unique.length === 0) return 0;
    await Notification.insertMany(unique.map((recipient) => ({ ...payload, recipient })));
    return unique.length;
  } catch (err) {
    console.error('Failed to create notifications:', err.message);
    return 0;
  }
};

export const notifyEmployees = async (employeeIds, payload) => {
  try {
    const employees = await Employee.find({ _id: mongoose.trusted({ $in: employeeIds }) }).select('user').lean();
    return await notifyUsers(employees.map((e) => e.user), payload);
  } catch (err) {
    console.error('Failed to notify employees:', err.message);
    return 0;
  }
};
