import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';

try {
  await connectDB();
  const demoUsers = await User.find({ email: /^demo\.\d+@smartfood\.local$/ }).select('_id').lean();
  const demoIds = demoUsers.map((u) => u._id);

  if (demoIds.length === 0) {
    console.log('Không có dữ liệu demo để xóa.');
    process.exit(0);
  }

  const [mItemRes, mealRes, predRes, userRes] = await Promise.all([
    MealItem.deleteMany({ userId: { $in: demoIds } }),
    Meal.deleteMany({ userId: { $in: demoIds } }),
    AiPrediction.deleteMany({ userId: { $in: demoIds } }),
    User.deleteMany({ _id: { $in: demoIds } }),
  ]);

  console.log(
    `Đã dọn dữ liệu demo: ${userRes.deletedCount} users, ${predRes.deletedCount} scans, ${mealRes.deletedCount} meals, ${mItemRes.deletedCount} mealItems.`
  );
} catch (err) {
  console.error('Lỗi clearDemoData:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
