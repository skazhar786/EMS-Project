import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import { generateEmployeeId } from './generateEmployeeId.js';

// Usage: npm run seed:sample
// DEVELOPMENT ONLY. Creates one sample department and one sample employee login so you can
// test the employee dashboard before the Employee module exists. Records are flagged isSample.
const run = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Sample data must not be created in production');

  await connectDB();

  const email = 'employee@ems.com';
  if (await User.findOne({ email })) {
    console.log(`${email} already exists. Nothing changed.`);
    return;
  }

  const department =
    (await Department.findOne({ name: 'Engineering' })) ||
    (await Department.create({ name: 'Engineering', description: 'Sample department' }));

  const user = await User.create({ email, password: 'Employee@123', role: 'EMPLOYEE' });
  await Employee.create({
    employeeId: await generateEmployeeId(),
    user: user._id,
    fullName: 'Sample Employee',
    phone: '9876543210',
    gender: 'Other',
    department: department._id,
    designation: 'Software Engineer',
    basicSalary: 40000,
    isSample: true,
  });

  console.log('Sample employee created.');
  console.log('  Email:    employee@ems.com');
  console.log('  Password: Employee@123');
};

run()
  .catch((err) => {
    console.error('Sample seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
