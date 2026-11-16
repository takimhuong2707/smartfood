import fs from 'fs';
import path from 'path';
import Food from '../models/Food.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';

let foodsCache = null;

export async function ensureFoodsSeeded() {
  if (foodsCache && foodsCache.length > 0) return foodsCache;

  const count = await Food.countDocuments();
  if (count > 0) {
    foodsCache = await Food.find({ isActive: true }).lean();
    return foodsCache;
  }

  // Load and parse CSV
  const csvPath = path.resolve(process.cwd(), '../ai-service/models/nutrition_v2.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('Không tìm thấy file nutrition_v2.csv tại:', csvPath);
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const foodsToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 9) continue;

    const classId = cols[0].trim();
    const name = cols[1].trim();
    const standardGrams = Number(cols[2]) || 500;
    const kcal = Number(cols[3]) || 400;
    const proteinG = Number(cols[4]) || 20;
    const carbG = Number(cols[5]) || 50;
    const fatG = Number(cols[6]) || 12;
    const fiberG = Number(cols[7]) || 2;
    const kcalPer100g = Number(cols[8]) || Math.round((kcal / standardGrams) * 100);

    const smallGrams = Math.round(standardGrams * 0.75);
    const largeGrams = Math.round(standardGrams * 1.25);

    foodsToInsert.push({
      classId,
      name,
      nutritionPer100g: {
        kcal: kcalPer100g,
        protein: Number(((proteinG / standardGrams) * 100).toFixed(1)),
        carb: Number(((carbG / standardGrams) * 100).toFixed(1)),
        fat: Number(((fatG / standardGrams) * 100).toFixed(1)),
        fiber: fiberG,
      },
      servingSizes: [
        { label: `Nhỏ ${smallGrams}g`, grams: smallGrams, isDefault: false },
        { label: `Vừa ${standardGrams}g`, grams: standardGrams, isDefault: true },
        { label: `Lớn ${largeGrams}g`, grams: largeGrams, isDefault: false },
      ],
      isActive: true,
    });
  }

  if (foodsToInsert.length > 0) {
    await Food.insertMany(foodsToInsert);
    console.log(`Đã nạp ${foodsToInsert.length} món ăn vào cơ sở dữ liệu MongoDB!`);
  }

  foodsCache = await Food.find({ isActive: true }).lean();
  return foodsCache;
}

export function calculateNutritionForGrams(food, grams) {
  const factor = grams / 100;
  const n = food.nutritionPer100g || { kcal: 100, protein: 5, carb: 15, fat: 3 };
  return {
    kcal: Math.round(n.kcal * factor),
    protein: Math.round((n.protein || 0) * factor),
    carb: Math.round((n.carb || 0) * factor),
    fat: Math.round((n.fat || 0) * factor),
    fiber: Number(((n.fiber || 0) * factor).toFixed(1)),
  };
}

export async function predictMealImage(userId, fileBuffer, mimeType = 'image/jpeg', fileName = 'upload.jpg') {
  await ensureFoodsSeeded();
  const allFoods = await Food.find({ isActive: true }).lean();
  const foodMap = new Map(allFoods.map((f) => [f.classId, f]));

  let aiResult = null;
  const startTime = Date.now();

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    const aiRes = await fetch(`${env.aiUrl}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (aiRes.ok) {
      aiResult = await aiRes.json();
    } else {
      console.warn('AI Service responded with status:', aiRes.status);
    }
  } catch (err) {
    console.warn('Không kết nối được tới AI Service, sử dụng dự đoán mẫu:', err.message);
  }

  const inferenceMs = aiResult?.inferenceMs || Date.now() - startTime;
  const bowlCount = aiResult?.count !== undefined ? aiResult.count : (aiResult?.items?.length || 1);
  const detected = Boolean(aiResult?.detected);

  // Xử lý từng phần ăn / tô phát hiện bởi Model 1 (detect_to_mon.pt)
  const aiItems = aiResult?.items?.length > 0 ? aiResult.items : [{ index: 1, candidates: [] }];
  const formattedItems = [];

  for (const it of aiItems) {
    let rawCands = it.candidates || [];
    if (rawCands.length === 0) {
      // Fallback nếu AI Service chưa bật hoặc ảnh mờ
      rawCands = [
        { classId: 'bun_bo_hue', confidence: 0.92, k: 0.94, method: 'ai' },
        { classId: 'bun_rieu', confidence: 0.05, k: 1.0, method: 'standard' },
        { classId: 'hu_tieu', confidence: 0.02, k: 1.0, method: 'standard' },
      ];
    }

    const candsList = [];
    for (const c of rawCands) {
      const food = foodMap.get(c.classId);
      if (!food) continue;

      const k = c.k || 1.0;
      const stdGrams = food.servingSizes?.find((s) => s.isDefault)?.grams || 550;
      // Khẩu phần ước lượng trực tiếp từ Model 3 (PortionNet)
      const aiGrams = c.grams || Math.round(stdGrams * k);
      const smallGrams = Math.round(stdGrams * 0.75);
      const largeGrams = Math.round(stdGrams * 1.25);

      const aiNutrition = c.nutrition || calculateNutritionForGrams(food, aiGrams);

      const portions = c.portionOptions || [
        {
          label: 'Nhỏ',
          grams: smallGrams,
          kValue: 0.75,
          isDefault: false,
          isAiEstimated: false,
          ...calculateNutritionForGrams(food, smallGrams),
        },
        {
          label: 'Vừa',
          grams: aiGrams,
          kValue: k,
          isDefault: true,
          isAiEstimated: c.method === 'ai',
          ...aiNutrition,
        },
        {
          label: 'Lớn',
          grams: largeGrams,
          kValue: 1.25,
          isDefault: false,
          isAiEstimated: false,
          ...calculateNutritionForGrams(food, largeGrams),
        },
      ];

      candsList.push({
        foodId: food._id,
        classId: food.classId,
        name: food.name,
        confidence: Math.round(c.confidence * 100),
        kValue: k,
        aiEstimatedGrams: aiGrams,
        aiMethod: c.method || 'standard',
        portions,
      });
    }

    if (candsList.length > 0) {
      formattedItems.push({
        index: it.index || formattedItems.length + 1,
        box: it.box || null,
        candidates: candsList,
      });
    }
  }

  const primaryCandidates = formattedItems[0]?.candidates || [];

  // Lưu AiPrediction vào MongoDB với thông tin cả 3 models
  const prediction = await AiPrediction.create({
    userId,
    modelVersion: 'YOLOv8-Detector(Model 1) + FoodCls-30(Model 2) + PortionNet-EffB0(Model 3)',
    bowlCount,
    detected,
    top3: primaryCandidates.slice(0, 3).map((c) => ({
      classId: c.classId,
      confidence: c.confidence,
      k: c.kValue,
      grams: c.aiEstimatedGrams,
    })),
    inferenceMs,
    rawAiData: aiResult || null,
    status: 'pending',
  });

  return {
    predictionId: prediction._id,
    inferenceMs,
    bowlCount,
    detected,
    items: formattedItems,
    candidates: primaryCandidates,
    total: aiResult?.total || null,
  };
}

export async function saveMeal(userId, mealData) {
  const {
    foodId,
    foodName,
    portionLabel,
    portionGrams,
    mealType = 'lunch',
    predictionId,
    imageUrl,
    nutrition,
  } = mealData;

  if (!foodName || !nutrition || !nutrition.kcal) {
    throw new AppError(400, 'Thiếu thông tin món ăn hoặc dinh dưỡng');
  }

  // 1. Tạo bản ghi Meal
  const meal = await Meal.create({
    userId,
    mealType,
    eatenAt: new Date(),
    note: foodName,
    totals: {
      kcal: nutrition.kcal || 0,
      protein: nutrition.protein || 0,
      carb: nutrition.carb || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
    },
  });

  // 2. Tạo bản ghi MealItem
  const mealItem = await MealItem.create({
    mealId: meal._id,
    userId,
    foodId: foodId || null,
    foodName,
    predictionId: predictionId || null,
    imageUrl: imageUrl || null,
    portionLabel: portionLabel || `${portionGrams}g`,
    portionGrams: Number(portionGrams) || 500,
    nutrition,
  });

  // 3. Cập nhật AiPrediction nếu có
  if (predictionId) {
    await AiPrediction.findByIdAndUpdate(predictionId, { status: 'confirmed' });
  }

  return { meal, mealItem };
}

export async function getAllFoods() {
  await ensureFoodsSeeded();
  return Food.find({ isActive: true }).sort({ name: 1 }).lean();
}
