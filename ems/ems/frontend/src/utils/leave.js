export const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid'];
export const LEAVE_LABELS = { Casual: 'Casual Leave', Sick: 'Sick Leave', Earned: 'Earned Leave', Unpaid: 'Unpaid Leave' };
export const BALANCE_FIELD = { Casual: 'casual', Sick: 'sick', Earned: 'earned' };

// Working days between two "YYYY-MM-DD" dates (inclusive), skipping weekly-off weekdays.
export const countLeaveDays = (start, end, weeklyOff = []) => {
  if (!start || !end || end < start) return 0;
  const first = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  if ((last - first) / 864e5 > 400) return 0;
  let n = 0;
  for (let t = first; t <= last; t += 864e5) {
    if (!weeklyOff.includes(new Date(t).getUTCDay())) n += 1;
  }
  return n;
};
