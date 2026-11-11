// Attendance rules and date helpers. Everything is configurable through environment variables,
// and "which day is it?" always means the OFFICE's calendar day (OFFICE_TIMEZONE), not the server's.

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const getConfig = () => {
  let timeZone = process.env.OFFICE_TIMEZONE || 'Asia/Kolkata';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    console.warn(`Invalid OFFICE_TIMEZONE "${timeZone}", falling back to Asia/Kolkata`);
    timeZone = 'Asia/Kolkata';
  }
  const workStart = /^([01]\d|2[0-3]):[0-5]\d$/.test(process.env.WORK_START || '') ? process.env.WORK_START : '09:30';
  const weeklyOff = (process.env.WEEKLY_OFF_DAYS ?? '0,6')
    .split(',').map((s) => s.trim()).filter((s) => s !== '').map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return {
    timeZone,
    workStart, // HH:mm
    graceMinutes: num(process.env.LATE_GRACE_MINUTES, 15),
    halfDayHours: num(process.env.HALF_DAY_HOURS, 4),
    weeklyOff, // 0 = Sunday ... 6 = Saturday
  };
};

const parts = (date, timeZone, opts) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', ...opts })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );

// "YYYY-MM-DD" for the given instant, in the office timezone.
export const dateKey = (date, timeZone) => {
  const p = parts(date, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
};

export const isValidDateKey = (key) =>
  typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(new Date(`${key}T00:00:00.000Z`).getTime())
  && new Date(`${key}T00:00:00.000Z`).toISOString().startsWith(key);

export const keyToDate = (key) => new Date(`${key}T00:00:00.000Z`);
export const dateToKey = (date) => new Date(date).toISOString().slice(0, 10);
export const weekdayOf = (key) => keyToDate(key).getUTCDay();

// "HH:mm" (24h) for the given instant, in the office timezone.
export const localTime = (date, timeZone) => {
  if (!date) return null;
  const p = parts(new Date(date), timeZone, { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}:${p.minute}`;
};

const minutesOfDay = (date, timeZone) => {
  const [h, m] = localTime(date, timeZone).split(':').map(Number);
  return h * 60 + m;
};

const tzOffsetMs = (date, timeZone) => {
  const p = parts(date, timeZone, {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

// Converts a wall-clock time in the office timezone ("2026-11-10", "09:30") to a real instant.
export const zonedToUtc = (key, hhmm, timeZone) => {
  const [y, m, d] = key.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - tzOffsetMs(new Date(guess), timeZone);
  t = guess - tzOffsetMs(new Date(t), timeZone);
  return new Date(t);
};

export const checkInStatus = (checkIn, cfg) => {
  const [h, m] = cfg.workStart.split(':').map(Number);
  return minutesOfDay(checkIn, cfg.timeZone) > h * 60 + m + cfg.graceMinutes ? 'Late' : 'Present';
};

export const computeHours = (checkIn, checkOut) =>
  Math.max(Math.round(((checkOut - checkIn) / 3600000) * 100) / 100, 0);

export const toClientRecord = (rec, cfg) => ({
  _id: rec._id,
  date: dateToKey(rec.date),
  status: rec.status,
  checkInTime: localTime(rec.checkIn, cfg.timeZone),
  checkOutTime: localTime(rec.checkOut, cfg.timeZone),
  workHours: rec.workHours || 0,
  edited: !!rec.editedBy,
});

export const publicRules = (cfg) => ({
  timeZone: cfg.timeZone,
  workStart: cfg.workStart,
  graceMinutes: cfg.graceMinutes,
  halfDayHours: cfg.halfDayHours,
  weeklyOff: cfg.weeklyOff,
});

// Month range [start, end) as UTC-midnight dates, for querying records.
export const monthRange = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

export const monthKeys = (year, month) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return { startKey: `${year}-${mm}-01`, endKey: `${year}-${mm}-${String(last).padStart(2, '0')}` };
};

export const parseMonthYear = (query, todayKey) => {
  const [ty, tm] = todayKey.split('-').map(Number);
  const month = parseInt(query.month, 10);
  const year = parseInt(query.year, 10);
  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : tm,
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : ty,
  };
};

// Day-by-day view of one employee's month, built from REAL records only.
//  - a recorded day shows its recorded status
//  - an unrecorded working day on APPROVED leave is "On leave" (not Absent)
//  - an unrecorded working day in the past is Absent
//  - today with no record is "Not checked in" (the day is not over yet)
//  - weekly-off days without a record are "Weekly off"; days before joining and future days are skipped
export const buildMonth = ({ year, month, records, joiningKey, todayKey, cfg, leaveKeys = new Set() }) => {
  const byDate = new Map(records.map((r) => [dateToKey(r.date), r]));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];
  const summary = { workingDays: 0, present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, totalHours: 0 };

  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (key > todayKey) break;
    if (joiningKey && key < joiningKey) continue;

    const rec = byDate.get(key);
    const isOff = cfg.weeklyOff.includes(weekdayOf(key));
    let status;
    if (rec) status = rec.status;
    else if (isOff) status = 'Weekly off';
    else if (leaveKeys.has(key)) status = 'On leave';
    else status = key === todayKey ? 'Not checked in' : 'Absent';

    if (!isOff) summary.workingDays += 1;
    if (status === 'Present' || status === 'Late') summary.present += 1;
    if (status === 'Late') summary.late += 1;
    if (status === 'Half-day') summary.halfDay += 1;
    if (status === 'Absent') summary.absent += 1;
    if (status === 'On leave') summary.leave += 1;
    if (rec) summary.totalHours += rec.workHours || 0;

    days.push({
      date: key,
      weekday: weekdayOf(key),
      isWeeklyOff: isOff,
      status,
      recordId: rec?._id || null,
      checkInTime: rec ? localTime(rec.checkIn, cfg.timeZone) : null,
      checkOutTime: rec ? localTime(rec.checkOut, cfg.timeZone) : null,
      workHours: rec?.workHours || 0,
    });
  }

  summary.totalHours = Math.round(summary.totalHours * 100) / 100;
  return { days, summary };
};
