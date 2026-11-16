import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import Meal from '../models/Meal.js';
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

export async function getTodaySummary(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const realMeals = await Meal.find({
    userId,
    eatenAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ eatenAt: 1 });

  const targets = user.targets?.kcal
    ? user.targets
    : { bmr: 1500, tdee: 1800, kcal: 1800, protein: 110, carb: 230, fat: 55 };

  let consumed = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  let mealsList = [];

  if (realMeals.length > 0) {
    for (const m of realMeals) {
      consumed.kcal += m.totals?.kcal || 0;
      consumed.protein += m.totals?.protein || 0;
      consumed.carb += m.totals?.carb || 0;
      consumed.fat += m.totals?.fat || 0;

      const typeName =
        m.mealType === 'breakfast' ? 'Sáng' : m.mealType === 'lunch' ? 'Trưa' : m.mealType === 'dinner' ? 'Tối' : 'Phụ';

      mealsList.push({
        id: m._id,
        mealType: m.mealType,
        mealLabel: `${typeName} · ${m.note || 'Bữa ăn'}`,
        title: m.note || typeName,
        kcal: m.totals?.kcal || 0,
        done: true,
      });
    }

    // Luôn có nút chụp món để ghi nhận thêm bữa ăn mới
    mealsList.push({
      id: 'add-new',
      mealType: 'dinner',
      mealLabel: 'Bữa tiếp theo',
      title: 'Chụp món để ghi nhận',
      kcal: 0,
      done: false,
      iconBg: '#E0F2F1',
    });
  } else {
    // Default demonstration data matching design when user hasn't added meals today
    consumed = { kcal: 1240, protein: 62, carb: 150, fat: 38 };
    mealsList = [
      {
        id: '1',
        mealType: 'breakfast',
        mealLabel: 'Sáng · Vừa 450g',
        title: 'Bánh canh',
        kcal: 420,
        done: true,
        iconBg: '#E8F5E9',
      },
      {
        id: '2',
        mealType: 'lunch',
        mealLabel: 'Trưa · Vừa 550g',
        title: 'Bún bò Huế',
        kcal: 540,
        done: true,
        iconBg: '#FFF3E0',
      },
      {
        id: '3',
        mealType: 'dinner',
        mealLabel: 'Tối',
        title: 'Chụp món để ghi nhận',
        kcal: 0,
        done: false,
        iconBg: '#E0F2F1',
      },
    ];
  }

  const remainingKcal = Math.max(targets.kcal - consumed.kcal, 0);

  return {
    targets,
    consumed,
    remainingKcal,
    meals: mealsList,
    recommendation: `Còn ${remainingKcal} kcal. Bữa tối nên chọn món dưới 500 kcal, nhiều đạm.`,
  };
}
