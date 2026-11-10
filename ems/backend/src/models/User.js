import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = Object.freeze({ ADMIN: 'ADMIN', EMPLOYEE: 'EMPLOYEE' });

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default queries
    },
    role: {
      type: String,
      enum: { values: Object.values(ROLES), message: 'Role must be ADMIN or EMPLOYEE' },
      default: ROLES.EMPLOYEE,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password; // safety net: a hash can never leave through res.json()
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash only when the password is new or changed.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
