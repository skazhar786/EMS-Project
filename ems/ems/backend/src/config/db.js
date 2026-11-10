import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Copy .env.example to .env and set it.');
  }

  mongoose.set('strictQuery', true);
  // Treats query-filter objects supplied by users as literal values,
  // which blocks NoSQL operator injection such as { "$gt": "" }.
  mongoose.set('sanitizeFilter', true);

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
};
