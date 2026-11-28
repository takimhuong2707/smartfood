import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Food from '../models/Food.js';
import MealItem from '../models/MealItem.js';
import Feedback from '../models/Feedback.js';
import ChatMessage from '../models/ChatMessage.js';
import AppError from '../utils/AppError.js';
import { recordAuditLog } from '../utils/auditLog.js';
import { invalidateFoodsCache } from './meal.service.js';
import { resolveDefaultFoodImage } from '../utils/foodImage.js';
import { FOOD_DETAILS } from '../data/foodDetails.js';

const foodNamesPath = path.resolve(process.cwd(), 'src/data/foodNames.json');
const VALID_AI_CLASSES = new Set(Object.keys(JSON.parse(fs.readFileSync(foodNamesPath, 'utf-8'))));

const ADMIN_IMAGE_DIR = path.resolve(process.cwd(), 'public/food-images/admin');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeDeleteAdminImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  if (!imageUrl.startsWith('/food-images/admin/')) return;
  const filename = path.basename(imageUrl);
  const resolved = path.resolve(ADMIN_IMAGE_DIR, filename);
  if (resolved.startsWith(ADMIN_IMAGE_DIR + path.sep) && fs.existsSync(resolved)) {
    try {
      fs.unlinkSync(resolved);
    } catch (err) {
      console.error('Không xóa được ảnh cũ:', err.message);
    }
  }
}

function hasValidImageMagicBytes(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 3) return false;

    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (isJpeg) return true;

    if (bytesRead >= 8) {
      const isPng =
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a;
      if (isPng) return true;
    }

    if (bytesRead >= 12) {
      const isWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
      if (isWebp) return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore close error
      }
    }
  }
}

function validateNutrition(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new AppError(400, 'Thiếu thông tin dinh dưỡng');
  }
  const kcal = Number(raw.kcal);
  const protein = raw.protein !== undefined && raw.protein !== '' ? Number(raw.protein) : 0;
  const carb = raw.carb !== undefined && raw.carb !== '' ? Number(raw.carb) : 0;
  const fat = raw.fat !== undefined && raw.fat !== '' ? Number(raw.fat) : 0;
  const fiber = raw.fiber !== undefined && raw.fiber !== '' ? Number(raw.fiber) : 0;

  if (!Number.isFinite(kcal) || kcal < 0 || kcal > 5000) {
    throw new AppError(400, 'Calo phải là số từ 0 đến 5000');
  }
  for (const [label, val] of [
    ['Đạm (protein)', protein],
    ['Tinh bột (carb)', carb],
    ['Chất béo (fat)', fat],
  ]) {
    if (!Number.isFinite(val) || val < 0 || val > 500) {
      throw new AppError(400, `${label} phải là số từ 0 đến 500`);
    }
  }
  if (!Number.isFinite(fiber) || fiber < 0 || fiber > 200) {
    throw new AppError(400, 'Chất xơ (fiber) phải là số từ 0 đến 200');
  }
  return { kcal, protein, carb, fat, fiber };
}

function buildServingSizes(rawGrams, fallback = 500) {
  const num =
    rawGrams !== undefined && rawGrams !== null && rawGrams !== ''
      ? Math.round(Number(rawGrams))
      : fallback;
  if (!Number.isFinite(num) || num < 10 || num > 5000) {
    throw new AppError(400, 'Khẩu phần chuẩn (gram) phải là số từ 10 đến 5000');
  }
  const small = Math.round(num * 0.75);
  const large = Math.round(num * 1.25);
  return [
    { label: `Nhỏ ${small}g`, grams: small, isDefault: false },
    { label: `Vừa ${num}g`, grams: num, isDefault: true },
    { label: `Lớn ${large}g`, grams: large, isDefault: false },
  ];
}

export async function listFoods({
  search = '',
  source = '',
  hasAiClass = '',
  isActive = 'true',
  page = 1,
  limit = 20,
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = {};
  if (isActive === 'false') {
    filter.isActive = false;
  } else if (isActive !== 'all') {
    filter.isActive = { $ne: false };
  }

  if (typeof search === 'string' && search.trim()) {
    filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
  }
  if (source === 'system' || source === 'user' || source === 'admin') {
    filter.source = source;
  }
  if (hasAiClass === 'true') {
    filter.aiClassId = { $exists: true, $ne: null };
  } else if (hasAiClass === 'false') {
    filter.$or = [{ aiClassId: { $exists: false } }, { aiClassId: null }];
  }

  const [items, total] = await Promise.all([
    Food.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Food.countDocuments(filter),
  ]);

  const enrichedItems = items.map((f) => {
    const extra = FOOD_DETAILS[f.aiClassId || f.classId] || {};
    return {
      ...f,
      ingredients: f.ingredients || extra.ingredients,
      cookingMethod: f.cookingMethod || extra.cookingMethod,
      mealTime: f.mealTime || extra.mealTime,
      imageUrl: f.imageUrl || resolveDefaultFoodImage(f.aiClassId || f.classId, f.name),
    };
  });

  return {
    items: enrichedItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

export async function getFoodById(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID món ăn không hợp lệ');
  const food = await Food.findById(id).lean();
  if (!food) throw new AppError(404, 'Không tìm thấy món ăn');
  const extra = FOOD_DETAILS[food.aiClassId || food.classId] || {};
  return {
    ...food,
    ingredients: food.ingredients || extra.ingredients,
    cookingMethod: food.cookingMethod || extra.cookingMethod,
    mealTime: food.mealTime || extra.mealTime,
    imageUrl: food.imageUrl || resolveDefaultFoodImage(food.aiClassId || food.classId, food.name),
  };
}

export async function createFood(adminId, payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) throw new AppError(400, 'Tên món ăn không được để trống');

  const nutritionPer100g = validateNutrition(payload.nutritionPer100g);
  const servingSizes = buildServingSizes(payload.standardServingGrams, 500);

  let aiClassId;
  if (typeof payload.aiClassId === 'string' && payload.aiClassId.trim()) {
    const cleanAi = payload.aiClassId.trim();
    if (!VALID_AI_CLASSES.has(cleanAi)) {
      throw new AppError(400, 'Lớp AI không hợp lệ (không thuộc 30 lớp)');
    }
    const dup = await Food.findOne({ $or: [{ aiClassId: cleanAi }, { classId: cleanAi }] });
    if (dup) throw new AppError(409, 'Lớp AI này đã được gán cho món ăn khác');
    aiClassId = cleanAi;
  }

  const classId = aiClassId || `admin_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const resolvedDefaultImg =
    typeof payload.imageUrl === 'string' && payload.imageUrl.trim()
      ? payload.imageUrl.trim()
      : resolveDefaultFoodImage(aiClassId || classId, name);

  const food = await Food.create({
    classId,
    ...(aiClassId ? { aiClassId } : {}),
    name,
    source: 'admin',
    ingredients: typeof payload.ingredients === 'string' ? payload.ingredients.trim() : undefined,
    cookingMethod: typeof payload.cookingMethod === 'string' ? payload.cookingMethod.trim() : undefined,
    mealTime: typeof payload.mealTime === 'string' ? payload.mealTime.trim() : undefined,
    imageUrl: resolvedDefaultImg,
    nutritionPer100g,
    servingSizes,
    isActive: true,
  });

  invalidateFoodsCache();
  await recordAuditLog({
    adminId,
    action: 'CREATE_FOOD',
    targetType: 'Food',
    targetId: food._id,
    summary: `Tạo món ăn: ${food.name}`,
  });

  return food;
}

export async function updateFood(adminId, id, payload) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID món ăn không hợp lệ');
  const food = await Food.findById(id);
  if (!food) throw new AppError(404, 'Không tìm thấy món ăn');

  if (payload.aiClassId !== undefined && payload.aiClassId !== food.aiClassId) {
    if (food.aiClassId) {
      throw new AppError(400, 'Không thể thay đổi lớp AI của món ăn đã gắn lớp AI');
    }
    const cleanAi = typeof payload.aiClassId === 'string' ? payload.aiClassId.trim() : '';
    if (cleanAi) {
      if (!VALID_AI_CLASSES.has(cleanAi)) {
        throw new AppError(400, 'Lớp AI không hợp lệ (không thuộc 30 lớp)');
      }
      const dup = await Food.findOne({ _id: { $ne: id }, $or: [{ aiClassId: cleanAi }, { classId: cleanAi }] });
      if (dup) throw new AppError(409, 'Lớp AI này đã được gán cho món ăn khác');
      food.aiClassId = cleanAi;
    }
  }

  if (payload.name !== undefined) {
    const cleanName = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!cleanName) throw new AppError(400, 'Tên món ăn không được để trống');
    food.name = cleanName;
  }

  if (payload.nutritionPer100g !== undefined) {
    food.nutritionPer100g = validateNutrition(payload.nutritionPer100g);
  }
  if (payload.standardServingGrams !== undefined && payload.standardServingGrams !== '') {
    food.servingSizes = buildServingSizes(payload.standardServingGrams);
  }
  if (typeof payload.ingredients === 'string') food.ingredients = payload.ingredients.trim();
  if (typeof payload.cookingMethod === 'string') food.cookingMethod = payload.cookingMethod.trim();
  if (typeof payload.mealTime === 'string') food.mealTime = payload.mealTime.trim();
  if (typeof payload.imageUrl === 'string') food.imageUrl = payload.imageUrl.trim();

  await food.save();
  invalidateFoodsCache();
  await recordAuditLog({
    adminId,
    action: 'UPDATE_FOOD',
    targetType: 'Food',
    targetId: food._id,
    summary: `Cập nhật món ăn: ${food.name}`,
  });

  return food;
}

export async function deleteFood(adminId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID món ăn không hợp lệ');
  const food = await Food.findById(id);
  if (!food) throw new AppError(404, 'Không tìm thấy món ăn');

  if (food.aiClassId || VALID_AI_CLASSES.has(food.classId)) {
    throw new AppError(409, 'Không thể ẩn hoặc xóa món ăn thuộc 30 lớp nhận diện AI');
  }

  const [inMeal, inFeedback, inChat] = await Promise.all([
    MealItem.exists({ foodId: food._id }),
    Feedback.exists({ correctFoodId: food._id }),
    ChatMessage.exists({ matchedFoodIds: food._id }),
  ]);

  if (inMeal || inFeedback || inChat) {
    food.isActive = false;
    food.deletedAt = new Date();
    await food.save();
    invalidateFoodsCache();
    await recordAuditLog({
      adminId,
      action: 'HIDE_FOOD',
      targetType: 'Food',
      targetId: food._id,
      summary: `Ẩn món ăn (đang được tham chiếu): ${food.name}`,
    });
    return { hidden: true, message: 'Món ăn đang được sử dụng nên đã được ẩn khỏi danh sách' };
  }

  safeDeleteAdminImage(food.imageUrl);
  await Food.findByIdAndDelete(id);
  invalidateFoodsCache();
  await recordAuditLog({
    adminId,
    action: 'DELETE_FOOD',
    targetType: 'Food',
    targetId: id,
    summary: `Xóa vĩnh viễn món ăn: ${food.name}`,
  });

  return { deleted: true, message: 'Đã xóa món ăn vĩnh viễn' };
}

export async function restoreFood(adminId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID món ăn không hợp lệ');
  const food = await Food.findById(id);
  if (!food) throw new AppError(404, 'Không tìm thấy món ăn');

  if (food.isActive !== false) {
    return { restored: true, message: 'Món ăn đang ở trạng thái hoạt động', food };
  }

  food.isActive = true;
  food.deletedAt = undefined;
  await food.save();

  invalidateFoodsCache();
  await recordAuditLog({
    adminId,
    action: 'RESTORE_FOOD',
    targetType: 'Food',
    targetId: food._id,
    summary: `Khôi phục món ăn đã ẩn: ${food.name}`,
  });

  return { restored: true, message: 'Đã khôi phục món ăn thành công', food };
}

export async function updateFoodImage(adminId, id, file) {
  if (!mongoose.isValidObjectId(id)) {
    if (file?.filename) safeDeleteAdminImage(`/food-images/admin/${file.filename}`);
    throw new AppError(400, 'ID món ăn không hợp lệ');
  }
  if (!file) throw new AppError(400, 'Vui lòng chọn file ảnh');

  if (!hasValidImageMagicBytes(file.path)) {
    safeDeleteAdminImage(`/food-images/admin/${file.filename}`);
    throw new AppError(400, 'Nội dung file không phải ảnh hợp lệ (chỉ chấp nhận JPEG, PNG, WEBP)');
  }

  const food = await Food.findById(id);
  if (!food) {
    safeDeleteAdminImage(`/food-images/admin/${file.filename}`);
    throw new AppError(404, 'Không tìm thấy món ăn');
  }

  const oldImageUrl = food.imageUrl;
  food.imageUrl = `/food-images/admin/${file.filename}`;
  await food.save();

  safeDeleteAdminImage(oldImageUrl);
  invalidateFoodsCache();
  await recordAuditLog({
    adminId,
    action: 'UPDATE_FOOD_IMAGE',
    targetType: 'Food',
    targetId: food._id,
    summary: `Cập nhật ảnh món ăn: ${food.name}`,
  });

  return food;
}
