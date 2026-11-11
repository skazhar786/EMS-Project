# Employee Management System (MERN)

Status: Phase 8 complete (dashboards, analytics, activity log).

## Backend
```bash
cd backend
npm install
cp .env.example .env     # set MONGO_URI and JWT_SECRET
npm run seed:admin       # creates the admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run seed:sample      # optional, dev only: sample employee (employee@ems.com / Employee@123)
npm run dev
```

## Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Auth API (base /api)
| Method | Endpoint | Access |
|---|---|---|
| POST | /auth/login | Public (10 failed attempts / 15 min / IP) |
| GET | /auth/me | Authenticated |
| POST | /auth/logout | Authenticated |
| PUT | /auth/change-password | Authenticated |

## Employee & Department API (admin only unless noted)
| Method | Endpoint | Notes |
|---|---|---|
| GET | /departments | any logged-in user; `?search=` |
| GET/POST | /departments, /departments/:id | |
| PUT/DELETE | /departments/:id | delete blocked while employees assigned |
| GET | /employees | `page, limit, search, department, designation, status, employmentType, sortBy, order` |
| GET | /employees/designations, /employees/options | filter / picker data |
| POST | /employees | creates login + profile, generates EMP-0001 style ID |
| GET/PUT/DELETE | /employees/:id | |
| PATCH | /employees/:id/status | Active / Inactive (also enables/disables login) |

## Profile API
| Method | Endpoint | Access |
|---|---|---|
| GET / PUT | /profile | Employee (own record only; editable: phone, gender, date of birth, address) |
| PUT / DELETE | /profile/avatar | Employee (multipart field `avatar`, JPG/PNG/WebP, max 2 MB) |
| PUT / DELETE | /employees/:id/avatar | Admin |

Uploaded images are stored in `backend/uploads/avatars` (git-ignored) and served from `/uploads/...`.
For production hosting with an ephemeral disk, switch storage to a cloud bucket.

## Task, Notification & Announcement API
| Method | Endpoint | Access |
|---|---|---|
| GET / POST | /tasks | Admin (filters: search, employee, priority, status incl. Overdue; sort; pagination) |
| PUT / DELETE | /tasks/:id | Admin |
| GET | /tasks/my | Employee (only tasks assigned to them) |
| PATCH | /tasks/:id/status | Employee (changes only their own progress) |
| GET | /notifications, /notifications/unread-count | Any user (own only) |
| PATCH | /notifications/:id/read, /notifications/read-all | Any user (own only) |
| GET / POST / DELETE | /announcements | Admin (optionally limited to one department) |

Each assignee has their own status; the task's overall status is derived from them.
"Overdue" is calculated when read (deadline day passed and not completed), never stored.

## Attendance API
| Method | Endpoint | Access |
|---|---|---|
| POST | /attendance/check-in, /attendance/check-out | Employee (own record; duplicates and check-out without check-in are rejected) |
| GET | /attendance/today, /attendance/my?month=&year= | Employee (own only) |
| GET | /attendance?date=&department=&search=&status= | Admin: daily overview |
| GET | /attendance/employee/:id?month=&year= | Admin: one employee's month |
| GET | /attendance/report, /attendance/export | Admin: monthly report / CSV |
| PUT | /attendance/manual | Admin: create or correct one day |
| DELETE | /attendance/:id | Admin |

Rules are configurable in `backend/.env` (see `.env.example`): OFFICE_TIMEZONE, WORK_START,
LATE_GRACE_MINUTES, HALF_DAY_HOURS, WEEKLY_OFF_DAYS. "Today" always means the office's calendar day.
Absent is derived: a past working day with no record. Nothing is stored for days nobody checked in.

## Leave API
| Method | Endpoint | Access |
|---|---|---|
| POST | /leaves | Employee: apply (type, startDate, endDate, reason) |
| GET | /leaves/my, /leaves/balance | Employee (own only) |
| DELETE | /leaves/:id | Employee: withdraw own PENDING request |
| GET | /leaves | Admin: filters status, type, department, employee, from, to |
| GET | /leaves/employee/:id | Admin: one employee's balance and history |
| PATCH | /leaves/:id/approve, /leaves/:id/reject | Admin (reject requires remarks) |
| PUT | /leaves/balance/:employeeId | Admin: set casual / sick / earned balances |

Rules: end date >= start date; max 90 days per request; no overlap with another Pending or Approved
request; weekly-off days are not counted; only APPROVED leave reduces the balance (atomically, never below
zero). Approved leave days appear as "On leave" in attendance instead of "Absent".

## Payroll API
| Method | Endpoint | Access |
|---|---|---|
| GET | /payroll/defaults | Admin (HRA / PF auto-fill percentages from .env) |
| GET | /payroll/structures | Admin (employees with their structure; filters: search, department, configured) |
| GET / PUT | /payroll/structures/:employeeId | Admin (create or update; employee is notified) |
| POST | /payroll/generate | Admin: `{ month, year, department? }`, creates Pending payslips (never duplicates) |
| GET | /payroll/payments | Admin: month, year, status, department, search + totals |
| GET | /payroll/export | Admin: CSV of the same filter |
| PUT | /payroll/payments/:id | Admin: adjust a PENDING payslip |
| PATCH | /payroll/payments/:id/status | Admin: Paid / Pending (employee notified when Paid) |
| DELETE | /payroll/payments/:id | Admin: PENDING only |
| GET | /payroll/my/structure, /payroll/my | Employee (own data only) |

Gross = Basic + allowances. Net = Gross - deductions (integer-cent arithmetic, no rounding drift).
Payslips store a snapshot of the amounts, so later structure edits never change past payslips.
Payslip PDFs are generated in the browser (jsPDF).
This is a project-level payroll system, not a legally certified tax or statutory engine.

## Dashboard & Activity API
| Method | Endpoint | Access |
|---|---|---|
| GET | /dashboard/admin | Admin: stats, 5 chart datasets, recent activity (all computed from the database) |
| GET | /dashboard/employee | Employee: own profile, attendance, tasks, leave, salary, notifications |
| GET | /dashboard/activity | Admin: audit trail, filter `entityType`, paginated |

Notes: "Absent today" = active employees who have neither checked in nor are on approved leave (0 on a
weekly-off day). Task "Overdue" is calculated, never stored. The activity log is written by the server
(employee/department/task/attendance/leave/payroll/announcement actions) and entries expire after 1 year.

## Frontend routes
/login, /status, /admin/*, /employee/*

Next: Phase 9 (final testing checklist, deployment guide and project documentation).
