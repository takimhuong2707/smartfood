import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';

try {
  await connectDB();

  const existingDemo = await User.countDocuments({ email: /^demo\.\d+@smartfood\.local$/ });
  if (existingDemo >= 20) {
    console.log('Dữ liệu demo đã tồn tại, bỏ qua seed.');
    process.exit(0);
  }

  const foods = await Food.find({ isActive: { $ne: false } }).limit(10).lean();
  if (foods.length === 0) {
    console.log('Chưa có món ăn trong DB để tạo dữ liệu demo.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash('Demo123!', 10);
  const now = Date.now();
  const createdUsers = [];

  for (let i = 1; i <= 20; i++) {
    const email = `demo.${i}@smartfood.local`;
    let u = await User.findOne({ email });
    if (!u) {
      const daysAgo = i % 28;
      u = await User.create({
        email,
        fullName: `Demo User ${i}`,
        passwordHash,
        role: 'user',
        isActive: i !== 20,
        createdAt: new Date(now - daysAgo * 86400000),
      });
    }
    createdUsers.push(u);
  }

  for (let i = 0; i < 30; i++) {
    const u = createdUsers[i % createdUsers.length];
    const f = foods[i % foods.length];
    const ts = new Date(now - i * 86400000);

    const pred = await AiPrediction.create({
      userId: u._id,
      modelVersion: 'v2-demo',
      top3: [{ classId: f.classId, confidence: 0.75 + (i % 20) * 0.01 }],
      inferenceMs: 120 + (i % 50),
      status: 'confirmed',
      createdAt: ts,
    });

    const meal = await Meal.create({
      userId: u._id,
      mealType: i % 2 === 0 ? 'lunch' : 'dinner',
      eatenAt: ts,
      note: '[DEMO]',
      totals: { kcal: 450, protein: 20, carb: 50, fat: 15 },
    });

    await MealItem.create({
      mealId: meal._id,
      userId: u._id,
      foodId: f._id,
      foodName: f.name,
      predictionId: pred._id,
      portionGrams: 300,
      nutrition: { kcal: 450, protein: 20, carb: 50, fat: 15 },
      isCorrected: i % 5 === 0,
      createdAt: ts,
    });
  }

  console.log('Đã seed dữ liệu demo: 20 users, 30 scans, 30 meals.');
} catch (err) {
  console.error('Lỗi seedDemoData:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
