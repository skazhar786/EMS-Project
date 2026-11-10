import 'dotenv/config'; // must stay the first import so env vars are loaded before anything else
import app from './app.js';
import { connectDB } from './config/db.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

let server;

const start = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`EMS API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) server.close();
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  shutdown('unhandledRejection');
});

start();
