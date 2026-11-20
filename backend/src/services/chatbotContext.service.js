// Chuyển dữ liệu trong MongoDB thành dạng "thô" mà server chatbot cần.
// Server chatbot tự tính BMR, TDEE, mục tiêu kcal... (hàm build_ctx), Node KHÔNG tự tính.

import fs from 'fs';
import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';

// Nạp danh sách tên món: class_name -> tên hiển thị trong nutrition.csv
let foodNames = {};
try {
  const jsonPath = new URL('../data/foodNames.json', import.meta.url);
  foodNames = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
} catch (err) {
  console.warn('Không đọc được foodNames.json:', err.message);
}

// 1) Bảng quy đổi giá trị từ DB sang chuẩn Chatbot
const GENDER = {
  male: 'nam',
  nam: 'nam',
  female: 'nu',
  nu: 'nu',
  'nữ': 'nu',
};

const ACTIVITY = {
  sedentary: 'it',
  it: 'it',
  'ít': 'it',
  light: 'nhe',
  nhe: 'nhe',
  'nhẹ': 'nhe',
  moderate: 'vua',
  vua: 'vua',
  'vừa': 'vua',
  active: 'nhieu',
  nhieu: 'nhieu',
  'nhiều': 'nhieu',
  very_active: 'rat_nhieu',
  rat_nhieu: 'rat_nhieu',
};

const GOAL = {
  lose: 'giam_can',
  lose_weight: 'giam_can',
  giam_can: 'giam_can',
  maintain: 'duy_tri',
  duy_tri: 'duy_tri',
  gain_muscle: 'tang_co',
  tang_co: 'tang_co',
  balanced: 'can_bang',
  can_bang: 'can_bang',
};

const BUA_MAP = {
  breakfast: 'sang',
  sang: 'sang',
  lunch: 'trua',
  trua: 'trua',
  dinner: 'toi',
  toi: 'toi',
  snack: 'phu',
  phu: 'phu',
};

const lower = (v) => String(v ?? '').trim().toLowerCase();

export function toProfile(user) {
  if (!user) return null;

  let age = Number(user.age);
  if (!age && user.birthYear) {
    age = new Date().getFullYear() - Number(user.birthYear);
  }

  const p = {
    tuoi: age,
    gioi_tinh: GENDER[lower(user.gender)],
    can_nang_kg: Number(user.weightKg),
    chieu_cao_cm: Number(user.heightCm),
    muc_van_dong: ACTIVITY[lower(user.activityLevel)],
    muc_tieu: GOAL[lower(user.goal)],
    mang_thai: Boolean(user.isPregnant),
    benh_ly: Boolean(user.hasMedicalCondition),
  };

  // Nếu thiếu hoặc không quy đổi được trường nào thì coi như CHƯA CÓ HỒ SƠ.
  // Chatbot sẽ nhắc người dùng nhập hồ sơ (không bịa số).
  const ok =
    p.tuoi > 0 &&
    p.gioi_tinh &&
    p.can_nang_kg > 0 &&
    p.chieu_cao_cm > 0 &&
    p.muc_van_dong &&
    p.muc_tieu;

  return ok ? p : null;
}

// 2) Lấy thông tin user và chỉ số thể trạng mới nhất từ MongoDB
export async function getUserDoc(userId) {
  if (!userId) return null;
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const latestMetric = await BodyMetric.findOne({ userId })
    .sort({ recordedAt: -1 })
    .lean();

  return {
    ...user,
    heightCm: latestMetric?.heightCm || null,
    weightKg: latestMetric?.weightKg || null,
  };
}

// 3) Lấy các bữa ăn trong ngày hôm nay của người dùng
export async function getTodayMeals(userId) {
  if (!userId) return [];

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const meals = await Meal.find({
    userId,
    eatenAt: { $gte: start, $lte: end },
  }).lean();

  if (meals.length === 0) return [];

  const mealIds = meals.map((m) => m._id);
  const items = await MealItem.find({ mealId: { $in: mealIds } }).lean();

  const itemsByMealId = new Map();
  for (const it of items) {
    const key = String(it.mealId);
    const arr = itemsByMealId.get(key) || [];
    arr.push(it);
    itemsByMealId.set(key, arr);
  }

  return meals.map((m) => ({
    ...m,
    items: itemsByMealId.get(String(m._id)) || [],
  }));
}

export const displayName = (it) =>
  foodNames[it.class_name] ||
  it.foodName ||
  it.name ||
  it.class_name ||
  'Món ăn';

export function toMeals(dbMeals) {
  return (dbMeals || []).map((m) => {
    const bua = BUA_MAP[m.mealType] || 'phu';
    const monList = (m.items || []).map(displayName);
    if (monList.length === 0 && m.note) {
      monList.push(m.note);
    }

    return {
      bua,
      mon: monList.length > 0 ? monList : ['Món ăn'],
      kcal: Number(m.totals?.kcal) || 0,
      protein_g: Number(m.totals?.protein) || 0,
      chat_beo_g: Number(m.totals?.fat) || 0,
      carb_g: Number(m.totals?.carb) || 0,
      chat_xo_g: Number(m.totals?.fiber) || 0,
    };
  });
}

export async function buildChatInput(userId) {
  const [user, dbMeals] = await Promise.all([
    getUserDoc(userId),
    getTodayMeals(userId),
  ]);

  return {
    user,
    profile: toProfile(user),
    meals: toMeals(dbMeals),
  };
}

// 4) Lấy danh sách bữa ăn trong 7 ngày gần nhất để thống kê lịch sử
export async function getWeeklyMeals(userId) {
  if (!userId) return { days: [], totalMeals: 0, totalKcal: 0 };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const meals = await Meal.find({
    userId,
    eatenAt: { $gte: sevenDaysAgo },
  })
    .sort({ eatenAt: -1 })
    .lean();

  if (meals.length === 0) return { days: [], totalMeals: 0, totalKcal: 0 };

  const mealIds = meals.map((m) => m._id);
  const items = await MealItem.find({ mealId: { $in: mealIds } }).lean();

  const itemsByMealId = new Map();
  for (const it of items) {
    const key = String(it.mealId);
    const arr = itemsByMealId.get(key) || [];
    arr.push(it);
    itemsByMealId.set(key, arr);
  }

  const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const TYPE_NAMES = {
    breakfast: 'Bữa Sáng',
    lunch: 'Bữa Trưa',
    dinner: 'Bữa Tối',
    snack: 'Bữa Phụ',
  };

  const dayGroups = new Map();
  let totalKcalAll = 0;

  for (const m of meals) {
    const d = new Date(m.eatenAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateLabel = `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    const mealItems = itemsByMealId.get(String(m._id)) || [];
    let foodNamesList = mealItems.map(displayName);
    if (foodNamesList.length === 0 && m.note) {
      foodNamesList.push(m.note);
    }
    if (foodNamesList.length === 0) {
      foodNamesList.push('Món ăn');
    }

    const mealInfo = {
      id: m._id,
      bua: TYPE_NAMES[m.mealType] || 'Bữa ăn',
      mon: foodNamesList.join(', '),
      kcal: Number(m.totals?.kcal) || 0,
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    totalKcalAll += mealInfo.kcal;

    if (!dayGroups.has(dateKey)) {
      dayGroups.set(dateKey, {
        date: dateKey,
        dateLabel,
        totalKcal: 0,
        meals: [],
      });
    }

    const group = dayGroups.get(dateKey);
    group.totalKcal += mealInfo.kcal;
    group.meals.push(mealInfo);
  }

  return {
    days: Array.from(dayGroups.values()),
    totalMeals: meals.length,
    totalKcal: totalKcalAll,
  };
}
