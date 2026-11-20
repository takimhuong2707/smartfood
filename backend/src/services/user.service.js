import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AppError from '../utils/AppError.js';

export function calculateNutritionTargets({ weightKg, heightCm, gender, birthYear, activityLevel, goal }) {
  if (!weightKg || !heightCm || !birthYear) return null;

  const currentYear = new Date().getFullYear();
  const age = Math.max(currentYear - birthYear, 10);

  // Mifflin-St Jeor formula
  let bmr;
  if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = bmr * multiplier;

  let targetKcal;
  switch (goal) {
    case 'lose':
      targetKcal = Math.round(tdee - 450);
      break;
    case 'gain_muscle':
      targetKcal = Math.round(tdee + 350);
      break;
    case 'balanced':
    case 'maintain':
    default:
      targetKcal = Math.round(tdee);
      break;
  }

  if (targetKcal < 1200) targetKcal = 1200;

  const protein = Math.round(weightKg * 1.8);
  const fat = Math.round((targetKcal * 0.25) / 9);
  const carbKcal = Math.max(targetKcal - protein * 4 - fat * 9, 0);
  const carb = Math.round(carbKcal / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: targetKcal,
    protein,
    carb,
    fat,
  };
}

export function formatUserProfile(user, metric = null) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    gender: user.gender,
    birthYear: user.birthYear,
    activityLevel: user.activityLevel,
    goal: user.goal,
    targets: user.targets,
    hasProfile: Boolean(user.targets?.kcal),
    latestMetric: metric
      ? {
          heightCm: metric.heightCm,
          weightKg: metric.weightKg,
          recordedAt: metric.recordedAt,
        }
      : undefined,
  };
}

export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  const latestMetric = await BodyMetric.findOne({ userId }).sort({ recordedAt: -1 });
  return formatUserProfile(user, latestMetric);
}

export async function updateProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const { fullName, gender, birthYear, activityLevel, goal, heightCm, weightKg } = data;

  if (fullName !== undefined) user.fullName = String(fullName).trim();
  if (gender !== undefined) user.gender = gender;
  if (birthYear !== undefined) user.birthYear = Number(birthYear);
  if (activityLevel !== undefined) user.activityLevel = activityLevel;
  if (goal !== undefined) user.goal = goal;

  let latestMetric = null;
  if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
    latestMetric = await BodyMetric.create({
      userId: user._id,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: Number(weightKg),
      recordedAt: new Date(),
    });
  } else {
    latestMetric = await BodyMetric.findOne({ userId }).sort({ recordedAt: -1 });
  }

  const finalWeight = latestMetric?.weightKg || (weightKg ? Number(weightKg) : null);
  const finalHeight = latestMetric?.heightCm || (heightCm ? Number(heightCm) : null);

  if (finalWeight && finalHeight && user.birthYear) {
    const targets = calculateNutritionTargets({
      weightKg: finalWeight,
      heightCm: finalHeight,
      gender: user.gender || 'male',
      birthYear: user.birthYear,
      activityLevel: user.activityLevel || 'light',
      goal: user.goal || 'maintain',
    });
    if (targets) {
      user.targets = targets;
    }
  }

  await user.save();
  return formatUserProfile(user, latestMetric);
}

export async function getTodaySummary(userId, dateString = null) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  // Xác định ngày cần lấy dữ liệu (mặc định là hôm nay)
  let targetDate = new Date();
  if (dateString) {
    const parts = String(dateString).split('-');
    if (parts.length === 3) {
      targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
  }

  const toDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const realMeals = await Meal.find({
    userId,
    eatenAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ eatenAt: 1 });

  // Tìm danh sách các ngày có bữa ăn trong tuần để hiển thị chấm xanh trên lịch
  const weekStart = new Date(targetDate);
  const currentDay = weekStart.getDay(); // 0: CN, 1: T2...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  weekStart.setDate(weekStart.getDate() + distanceToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekMeals = await Meal.find({
    userId,
    eatenAt: { $gte: weekStart, $lte: weekEnd },
  }).select('eatenAt');

  const daysWithMeals = Array.from(new Set(weekMeals.map((m) => toDateKey(new Date(m.eatenAt)))));

  const targets = user.targets?.kcal
    ? user.targets
    : { bmr: 1500, tdee: 1800, kcal: 1800, protein: 110, carb: 230, fat: 55 };

  let consumed = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  let mealsList = [];

  const isToday = toDateKey(targetDate) === toDateKey(new Date());

  if (realMeals.length > 0) {
    for (const m of realMeals) {
      consumed.kcal += m.totals?.kcal || 0;
      consumed.protein += m.totals?.protein || 0;
      consumed.carb += m.totals?.carb || 0;
      consumed.fat += m.totals?.fat || 0;

      const typeName =
        m.mealType === 'breakfast'
          ? 'Sáng'
          : m.mealType === 'lunch'
          ? 'Trưa'
          : m.mealType === 'dinner'
          ? 'Tối'
          : 'Phụ';

      const timeStr = new Date(m.eatenAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      mealsList.push({
        id: String(m._id),
        mealType: m.mealType,
        mealLabel: `${typeName} · ${timeStr}`,
        title: m.note || typeName,
        kcal: m.totals?.kcal || 0,
        done: true,
        iconBg: '#E8F5E9',
      });
    }

    // Nút ghi nhận thêm món
    mealsList.push({
      id: 'add-new',
      mealType: 'dinner',
      mealLabel: 'Ghi nhận thêm',
      title: 'Chụp món để ghi nhận',
      kcal: 0,
      done: false,
      iconBg: '#E0F2F1',
    });
  } else {
    // Không có bữa ăn nào: không dùng dữ liệu giả để tránh nhầm lẫn
    consumed = { kcal: 0, protein: 0, carb: 0, fat: 0 };
    mealsList = [
      {
        id: 'empty-add',
        mealType: 'breakfast',
        mealLabel: isToday ? 'Hôm nay' : 'Chưa có bữa ăn',
        title: 'Chụp món để ghi nhận bữa ăn',
        kcal: 0,
        done: false,
        iconBg: '#E0F2F1',
      },
    ];
  }

  const remainingKcal = Math.max(targets.kcal - consumed.kcal, 0);

  let recommendation = '';
  if (consumed.kcal === 0) {
    recommendation = `Chưa có bữa ăn nào được ghi nhận cho ngày này. Mục tiêu là ${targets.kcal.toLocaleString('vi-VN')} kcal.`;
  } else if (remainingKcal > 0) {
    recommendation = `Đã nạp ${consumed.kcal.toLocaleString('vi-VN')} kcal, còn ${remainingKcal.toLocaleString('vi-VN')} kcal. Nên chọn món giàu đạm và rau xanh.`;
  } else {
    recommendation = `Đã đạt mục tiêu calo (${consumed.kcal}/${targets.kcal} kcal). Uống đủ nước và duy trì vận động nhẹ nhé!`;
  }

  const VIETNAMESE_DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dateLabel = `${VIETNAMESE_DAYS[targetDate.getDay()]}, ${targetDate.getDate()} tháng ${targetDate.getMonth() + 1}`;

  return {
    targets,
    consumed,
    remainingKcal,
    meals: mealsList,
    recommendation,
    selectedDate: toDateKey(targetDate),
    dateLabel,
    daysWithMeals,
    isToday,
  };
}

export async function recordWeight(userId, weightKg) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const weight = parseFloat(weightKg);
  if (isNaN(weight) || weight < 20 || weight > 300) {
    throw new AppError(400, 'Cân nặng không hợp lệ (từ 20kg đến 300kg)');
  }

  const latest = await BodyMetric.findOne({ userId }).sort({ recordedAt: -1 });
  const heightCm = latest?.heightCm || user.heightCm || 156;

  const newMetric = await BodyMetric.create({
    userId: user._id,
    heightCm,
    weightKg: Number(weight.toFixed(1)),
    recordedAt: new Date(),
  });

  // Tự động tính toán lại targets dinh dưỡng chuẩn
  if (user.birthYear && heightCm) {
    const targets = calculateNutritionTargets({
      weightKg: weight,
      heightCm,
      gender: user.gender || 'female',
      birthYear: user.birthYear,
      activityLevel: user.activityLevel || 'light',
      goal: user.goal || 'lose',
    });
    if (targets) {
      user.targets = targets;
      await user.save();
    }
  }

  return {
    success: true,
    weightKg: newMetric.weightKg,
    recordedAt: newMetric.recordedAt,
    targets: user.targets,
  };
}

export async function getStatistics(userId, days = 7) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const numDays = days === 30 ? 30 : days === 14 ? 14 : 7;
  const targets = user.targets?.kcal
    ? user.targets
    : { bmr: 1205, tdee: 1657, kcal: 1200, protein: 85, carb: 141, fat: 33 };

  const targetKcal = targets.kcal || 1200;

  const now = new Date();
  const dayList = [];

  const toDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  let startDate, endDate;

  if (numDays === 7) {
    // Tuần hiện tại: Thứ 2 (T2) đến Chủ nhật (CN)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    startDate = new Date(monday);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dayList.push({
        date: toDateKey(d),
        label: DAY_LABELS[d.getDay()],
        dateLabel: `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
        kcal: 0,
        protein: 0,
        carb: 0,
        fat: 0,
        mealsCount: 0,
        meals: [],
      });
    }
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    endDate = sunday;
  } else {
    // 14 hoặc 30 ngày gần nhất
    const start = new Date(now);
    start.setDate(now.getDate() - (numDays - 1));
    start.setHours(0, 0, 0, 0);
    startDate = start;
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    for (let i = 0; i < numDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dayList.push({
        date: toDateKey(d),
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        dateLabel: `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
        kcal: 0,
        protein: 0,
        carb: 0,
        fat: 0,
        mealsCount: 0,
        meals: [],
      });
    }
  }

  // Truy vấn bữa ăn trong khoảng thời gian
  const meals = await Meal.find({
    userId,
    eatenAt: { $gte: startDate, $lte: endDate },
  })
    .sort({ eatenAt: 1 })
    .lean();

  const mealIds = meals.map((m) => m._id);
  const mealItems = await MealItem.find({ mealId: { $in: mealIds } }).lean();

  const itemsByMealId = new Map();
  for (const it of mealItems) {
    const key = String(it.mealId);
    const arr = itemsByMealId.get(key) || [];
    arr.push(it);
    itemsByMealId.set(key, arr);
  }

  const dayMap = new Map();
  dayList.forEach((d) => dayMap.set(d.date, d));

  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarb = 0;
  let totalFat = 0;
  let daysWithMeals = 0;
  let daysExceeded = 0;
  let daysOnTarget = 0;

  const mealTypeStats = {
    breakfast: { count: 0, kcal: 0 },
    lunch: { count: 0, kcal: 0 },
    dinner: { count: 0, kcal: 0 },
    snack: { count: 0, kcal: 0 },
  };

  const TYPE_NAMES = {
    breakfast: 'Bữa Sáng',
    lunch: 'Bữa Trưa',
    dinner: 'Bữa Tối',
    snack: 'Bữa Phụ',
  };

  for (const m of meals) {
    const dKey = toDateKey(new Date(m.eatenAt));
    const dayItem = dayMap.get(dKey);
    const k = Number(m.totals?.kcal) || 0;
    const p = Number(m.totals?.protein) || 0;
    const c = Number(m.totals?.carb) || 0;
    const f = Number(m.totals?.fat) || 0;

    totalKcal += k;
    totalProtein += p;
    totalCarb += c;
    totalFat += f;

    const mType = m.mealType || 'snack';
    if (mealTypeStats[mType]) {
      mealTypeStats[mType].count += 1;
      mealTypeStats[mType].kcal += k;
    }

    if (dayItem) {
      dayItem.kcal += k;
      dayItem.protein += p;
      dayItem.carb += c;
      dayItem.fat += f;
      dayItem.mealsCount += 1;

      const items = itemsByMealId.get(String(m._id)) || [];
      const itemNames = items.map((i) => i.foodName || i.name || 'Món ăn').join(', ');
      dayItem.meals.push({
        id: m._id,
        mealType: m.mealType,
        mealTypeName: TYPE_NAMES[m.mealType] || 'Bữa ăn',
        title: itemNames || m.note || 'Bữa ăn',
        kcal: k,
        time: new Date(m.eatenAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
    }
  }

  // Đánh giá trạng thái từng ngày
  dayList.forEach((d) => {
    d.isExceeded = d.kcal > targetKcal;
    if (d.kcal > 0) {
      daysWithMeals += 1;
      if (d.isExceeded) {
        daysExceeded += 1;
        d.status = 'exceeded';
      } else if (d.kcal >= targetKcal * 0.75) {
        daysOnTarget += 1;
        d.status = 'optimal';
      } else {
        d.status = 'under';
      }
    } else {
      d.status = 'empty';
    }
  });

  const avgKcal = daysWithMeals > 0 ? Math.round(totalKcal / daysWithMeals) : 0;

  // Tỉ lệ dinh dưỡng Đa lượng (1g Đạm = 4kcal, 1g Carb = 4kcal, 1g Béo = 9kcal)
  const proteinKcal = totalProtein * 4;
  const carbKcal = totalCarb * 4;
  const fatKcal = totalFat * 9;
  const macroKcalTotal = proteinKcal + carbKcal + fatKcal;

  let proteinPercent = 20;
  let carbPercent = 55;
  let fatPercent = 25;

  if (macroKcalTotal > 0) {
    proteinPercent = Math.round((proteinKcal / macroKcalTotal) * 100);
    carbPercent = Math.round((carbKcal / macroKcalTotal) * 100);
    fatPercent = Math.max(100 - proteinPercent - carbPercent, 0);
  }

  // Top món ăn nạp nhiều calo nhất
  const foodCountMap = new Map();
  for (const it of mealItems) {
    const name = it.foodName || it.name || 'Món ăn';
    const kcal = Number(it.nutrition?.kcal) || 0;
    const existing = foodCountMap.get(name) || { name, count: 0, totalKcal: 0 };
    existing.count += 1;
    existing.totalKcal += kcal;
    foodCountMap.set(name, existing);
  }
  const topFoods = Array.from(foodCountMap.values())
    .sort((a, b) => b.totalKcal - a.totalKcal)
    .slice(0, 5);

  // Thống kê cân nặng
  const weightMetrics = await BodyMetric.find({ userId })
    .sort({ recordedAt: -1 })
    .limit(30)
    .lean();

  const latestMetric = weightMetrics[0];
  const currentWeight = latestMetric?.weightKg || 47.0;
  const heightCm = latestMetric?.heightCm || 156;

  const oldestMetric = weightMetrics[weightMetrics.length - 1];
  const weightDiff = oldestMetric ? Number((currentWeight - oldestMetric.weightKg).toFixed(1)) : 0;

  let bmi = 0;
  let bmiStatus = 'Cân đối';
  if (heightCm > 0 && currentWeight > 0) {
    const h = heightCm / 100;
    bmi = Number((currentWeight / (h * h)).toFixed(1));
    if (bmi < 18.5) bmiStatus = 'Hơi gầy';
    else if (bmi < 23) bmiStatus = 'Cân đối';
    else if (bmi < 25) bmiStatus = 'Hơi thừa cân';
    else bmiStatus = 'Thừa cân';
  }

  // Tỉ lệ phân bổ theo 4 bữa ăn
  const totalMealKcal = Object.values(mealTypeStats).reduce((acc, m) => acc + m.kcal, 0) || 1;
  const mealBreakdown = [
    { type: 'breakfast', name: 'Sáng', kcal: mealTypeStats.breakfast.kcal, count: mealTypeStats.breakfast.count, percent: Math.round((mealTypeStats.breakfast.kcal / totalMealKcal) * 100), color: '#1E5136' },
    { type: 'lunch', name: 'Trưa', kcal: mealTypeStats.lunch.kcal, count: mealTypeStats.lunch.count, percent: Math.round((mealTypeStats.lunch.kcal / totalMealKcal) * 100), color: '#2E7D4F' },
    { type: 'dinner', name: 'Tối', kcal: mealTypeStats.dinner.kcal, count: mealTypeStats.dinner.count, percent: Math.round((mealTypeStats.dinner.kcal / totalMealKcal) * 100), color: '#E0783A' },
    { type: 'snack', name: 'Phụ', kcal: mealTypeStats.snack.kcal, count: mealTypeStats.snack.count, percent: Math.round((mealTypeStats.snack.kcal / totalMealKcal) * 100), color: '#6B7280' },
  ];

  // Nhận xét dinh dưỡng thông minh
  const insights = [];
  if (daysWithMeals === 0) {
    insights.push('Chưa có bữa ăn nào được ghi nhận trong khoảng thời gian này. Hãy dùng camera chụp món ăn để bắt đầu theo dõi!');
  } else {
    if (avgKcal <= targetKcal && avgKcal >= targetKcal * 0.8) {
      insights.push(`Mức calo trung bình (${avgKcal.toLocaleString('vi-VN')} kcal/ngày) rất lý tưởng, bám sát mục tiêu ${targetKcal.toLocaleString('vi-VN')} kcal.`);
    } else if (avgKcal > targetKcal) {
      insights.push(`Mức calo trung bình (${avgKcal.toLocaleString('vi-VN')} kcal/ngày) cao hơn mục tiêu ${targetKcal.toLocaleString('vi-VN')} kcal. Nên giảm bớt thức ăn nhanh và đồ ngọt.`);
    } else {
      insights.push(`Mức calo trung bình (${avgKcal.toLocaleString('vi-VN')} kcal/ngày) thấp hơn mục tiêu. Bạn nên ăn uống đủ bữa để có đủ năng lượng.`);
    }

    if (proteinPercent < 20) {
      insights.push(`Tỉ lệ đạm (${proteinPercent}%) hơi thấp. Hãy bổ sung thêm ức gà, trứng, cá, đậu phụ để bảo vệ cơ bắp.`);
    } else {
      insights.push(`Tỉ lệ đạm (${proteinPercent}%) duy trì rất tốt giúp cơ thể no lâu và đốt mỡ hiệu quả.`);
    }

    if (mealTypeStats.dinner.kcal > mealTypeStats.lunch.kcal && mealTypeStats.dinner.kcal > 0) {
      insights.push('Bạn đang ăn nhiều calo vào bữa tối hơn bữa trưa. Nên chuyển bớt khẩu phần ăn sang buổi sáng và trưa để tiêu hóa tốt hơn.');
    }
  }

  return {
    days: numDays,
    periodLabel: numDays === 7 ? 'Tuần này' : `${numDays} ngày gần nhất`,
    targets: {
      kcal: targetKcal,
      protein: targets.protein,
      carb: targets.carb,
      fat: targets.fat,
    },
    kpi: {
      avgKcal,
      totalKcal,
      totalMeals: meals.length,
      daysWithMeals,
      daysOnTarget,
      daysExceeded,
    },
    dailyChart: dayList.map((d) => ({
      date: d.date,
      label: d.label,
      dateLabel: d.dateLabel,
      kcal: d.kcal,
      protein: d.protein,
      carb: d.carb,
      fat: d.fat,
      mealsCount: d.mealsCount,
      isExceeded: d.isExceeded,
      status: d.status,
      meals: d.meals,
    })),
    macros: {
      protein: {
        percent: proteinPercent,
        totalGrams: Math.round(totalProtein),
        targetGrams: targets.protein || 85,
        avgGrams: daysWithMeals > 0 ? Math.round(totalProtein / daysWithMeals) : 0,
      },
      carb: {
        percent: carbPercent,
        totalGrams: Math.round(totalCarb),
        targetGrams: targets.carb || 141,
        avgGrams: daysWithMeals > 0 ? Math.round(totalCarb / daysWithMeals) : 0,
      },
      fat: {
        percent: fatPercent,
        totalGrams: Math.round(totalFat),
        targetGrams: targets.fat || 33,
        avgGrams: daysWithMeals > 0 ? Math.round(totalFat / daysWithMeals) : 0,
      },
    },
    mealBreakdown,
    topFoods,
    weight: {
      currentKg: currentWeight,
      diffKg: weightDiff,
      periodDays: numDays,
      heightCm,
      bmi,
      bmiStatus,
      history: weightMetrics.map((w) => ({
        date: toDateKey(new Date(w.recordedAt)),
        weightKg: w.weightKg,
      })),
    },
    insights,
  };
}
