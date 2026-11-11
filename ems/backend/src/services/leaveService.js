import mongoose from 'mongoose';
import Leave from '../models/Leave.js';
import { keyToDate, dateToKey, weekdayOf } from './attendanceService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Leave type -> field in Employee.leaveBalance. Unpaid leave has no balance.
export const BALANCE_FIELD = { Casual: 'casual', Sick: 'sick', Earned: 'earned' };

export const shiftKey = (key, n) => dateToKey(new Date(keyToDate(key).getTime() + n * DAY_MS));

export const eachDayKey = (startKey, endKey) => {
  const keys = [];
  for (let t = keyToDate(startKey).getTime(); t <= keyToDate(endKey).getTime(); t += DAY_MS) {
    keys.push(dateToKey(new Date(t)));
  }
  return keys;
};

// Number of working days in [startKey, endKey] (weekly-off days are not counted).
export const countLeaveDays = (startKey, endKey, cfg) =>
  eachDayKey(startKey, endKey).filter((k) => !cfg.weeklyOff.includes(weekdayOf(k))).length;

// For attendance: which days each employee is on APPROVED leave within [startKey, endKey].
// Returns Map(employeeId -> Set("YYYY-MM-DD")).
export const getLeaveKeysByEmployee = async (employeeIds, startKey, endKey) => {
  const leaves = await Leave.find({
    employee: mongoose.trusted({ $in: employeeIds }),
    status: 'Approved',
    startDate: mongoose.trusted({ $lte: keyToDate(endKey) }),
    endDate: mongoose.trusted({ $gte: keyToDate(startKey) }),
  })
    .select('employee startDate endDate')
    .lean();

  const map = new Map();
  leaves.forEach((l) => {
    const id = String(l.employee);
    if (!map.has(id)) map.set(id, new Set());
    eachDayKey(dateToKey(l.startDate), dateToKey(l.endDate)).forEach((k) => {
      if (k >= startKey && k <= endKey) map.get(id).add(k);
    });
  });
  return map;
};
