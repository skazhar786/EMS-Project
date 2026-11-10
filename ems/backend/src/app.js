import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import { UPLOAD_DIR } from './config/paths.js';

const app = express();

// Behind a reverse proxy (Render, Railway...) so rate limiting sees the real client IP.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ---- Security & parsing -------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow images from /uploads

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (no Origin header) and whitelisted origins.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'], // lets the browser read the CSV filename
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// General API limiter.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  })
);

// Uploaded profile pictures (random filenames, images only, no directory listing).
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '1d' }));

// ---- Routes ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  res.status(dbState === 'connected' ? 200 : 503).json({
    success: dbState === 'connected',
    message: dbState === 'connected' ? 'API is healthy' : 'Database is not connected',
    data: {
      status: dbState === 'connected' ? 'ok' : 'degraded',
      database: dbState,
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Strict limiter for login: 10 failed attempts per 15 minutes per IP.
// Successful logins are not counted.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
// More routers are mounted here in later phases.

// ---- Errors (must be last) ------------------------------------------------
app.use(notFound);
app.use(errorHandler);

export default app;
