# Employee Management System (MERN)

Status: Phase 5 complete (tasks, notifications, announcements).

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

## Frontend routes
/login, /status, /admin/*, /employee/*

Next: Phase 6 (Attendance and Leave).
