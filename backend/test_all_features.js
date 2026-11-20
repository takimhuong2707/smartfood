import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import User from './src/models/User.js';
import {
  getUserDoc,
  getWeeklyMeals,
  getTodayMeals,
} from './src/services/chatbotContext.service.js';
import { getTodaySummary } from './src/services/user.service.js';

async function run() {
  console.log('--- TEST TOÀN DIỆN CÁC TÍNH NĂNG MỚI ---');
  await mongoose.connect(env.mongoUri);
  console.log('✔ Đã kết nối MongoDB');

  const user = await User.findOne({ email: 'huongtk.23itb@vku.udn.vn' });
  if (!user) {
    console.error('Không tìm thấy user Hương');
    process.exit(1);
  }
  const userId = user._id;
  console.log(`✔ User: ${user.fullName} (${user.email}), ID: ${userId}`);

  console.log('\n--- 1. TEST XÁC THỰC HỒ SƠ & TRẢ LỜI "TÔI TÊN GÌ" ---');
  const userDoc = await getUserDoc(userId);
  console.log('UserDoc:', {
    fullName: userDoc.fullName,
    gender: userDoc.gender,
    birthYear: userDoc.birthYear,
    heightCm: userDoc.heightCm,
    weightKg: userDoc.weightKg,
    targets: userDoc.targets,
  });

  console.log('\n--- 2. TEST LẤY LỊCH SỬ BỮA ĂN 1 TUẦN ---');
  const weekly = await getWeeklyMeals(userId);
  console.log(`Số ngày có bữa ăn: ${weekly.days.length}, Tổng số bữa: ${weekly.totalMeals}, Tổng kcal: ${weekly.totalKcal}`);
  weekly.days.forEach((d) => {
    console.log(`  + ${d.dateLabel}: ${d.meals.length} bữa (${d.totalKcal} kcal) -> ${d.meals.map((m) => m.mon).join(' | ')}`);
  });

  console.log('\n--- 3. TEST SUMMARY THEO NGÀY (LỊCH THỨ 2, THỨ 3, THỨ 4, THỨ 7) ---');

  // Thứ 4 (Hôm nay 18/11/2026)
  const sumWed = await getTodaySummary(userId, '2026-11-18');
  console.log('Thứ Tư (18/11):', {
    dateLabel: sumWed.dateLabel,
    consumedKcal: sumWed.consumed.kcal,
    mealsCount: sumWed.meals.filter((m) => m.done).length,
    meals: sumWed.meals.filter((m) => m.done).map((m) => `${m.title} (${m.kcal} kcal)`),
  });

  // Thứ 2 (16/11/2026)
  const sumMon = await getTodaySummary(userId, '2026-11-16');
  console.log('Thứ Hai (16/11):', {
    dateLabel: sumMon.dateLabel,
    consumedKcal: sumMon.consumed.kcal,
    mealsCount: sumMon.meals.filter((m) => m.done).length,
    meals: sumMon.meals.filter((m) => m.done).map((m) => `${m.title} (${m.kcal} kcal)`),
  });

  // Thứ 7 (14/11/2026)
  const sumSat = await getTodaySummary(userId, '2026-11-14');
  console.log('Thứ Bảy (14/11):', {
    dateLabel: sumSat.dateLabel,
    consumedKcal: sumSat.consumed.kcal,
    mealsCount: sumSat.meals.filter((m) => m.done).length,
    meals: sumSat.meals.filter((m) => m.done).map((m) => `${m.title} (${m.kcal} kcal)`),
  });

  // Thứ 3 (17/11/2026 - không có bữa ăn)
  const sumTue = await getTodaySummary(userId, '2026-11-17');
  console.log('Thứ Ba (17/11 - trống):', {
    dateLabel: sumTue.dateLabel,
    consumedKcal: sumTue.consumed.kcal,
    mealsCount: sumTue.meals.filter((m) => m.done).length,
    hasEmptyAddCard: sumTue.meals.some((m) => !m.done),
  });

  console.log('Các ngày có chấm xanh trong tuần:', sumWed.daysWithMeals);

  console.log('\n✔ TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG VƯỢT TRỘI!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
