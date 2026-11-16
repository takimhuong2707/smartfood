import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    fullName: { type: String, required: true, trim: true },
    avatarUrl: String,
    gender: { type: String, enum: ['male', 'female'] },
    birthYear: Number,
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'light',
    },
    goal: {
      type: String,
      enum: ['lose', 'maintain', 'gain_muscle', 'balanced'],
      default: 'maintain',
    },
    targets: { bmr: Number, tdee: Number, kcal: Number, protein: Number, carb: Number, fat: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);