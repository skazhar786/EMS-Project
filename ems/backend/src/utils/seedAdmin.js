import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

// Usage: npm run seed:admin
// The only supported way to create an admin account. There is no public admin registration.
const run = async () => {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env');
  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  if (process.env.NODE_ENV === 'production' && password === 'ChangeMe@123') {
    throw new Error('Refusing to seed the default password in production. Choose a strong SEED_ADMIN_PASSWORD');
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`An account with ${email} already exists (role: ${existing.role}). Nothing changed.`);
    return;
  }

  await User.create({ email, password, role: 'ADMIN' });
  console.log(`Admin created: ${email}`);
  console.log('Log in, then change this password. Remove SEED_ADMIN_PASSWORD from .env afterwards.');
};

run()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
