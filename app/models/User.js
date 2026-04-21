import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['super admin', 'admin', 'sales agent', 'finance', 'member'],
      default: 'member',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
