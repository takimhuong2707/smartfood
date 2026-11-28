import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import Food from '../models/Food.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';
import Feedback from '../models/Feedback.js';
import Recommendation from '../models/Recommendation.js';
import AuditLog from '../models/AuditLog.js';
import { FOOD_DETAILS } from '../data/foodDetails.js';
import { resolveDefaultFoodImage } from '../utils/foodImage.js';

try {
  await connectDB();

  // 1. Update all 30 system foods with ingredients, cookingMethod, mealTime, category & imageUrl
  const allFoods = await Food.find({});
  for (const f of allFoods) {
    let changed = false;
    const extra = FOOD_DETAILS[f.aiClassId || f.classId];
    if (extra) {
      if (!f.category && extra.category) { f.category = extra.category; changed = true; }
      if (!f.ingredients && extra.ingredients) { f.ingredients = extra.ingredients; changed = true; }
      if (!f.cookingMethod && extra.cookingMethod) { f.cookingMethod = extra.cookingMethod; changed = true; }
      if (!f.mealTime && extra.mealTime) { f.mealTime = extra.mealTime; changed = true; }
    }
    if (!f.imageUrl) {
      const img = resolveDefaultFoodImage(f.aiClassId || f.classId, f.name);
      if (img) { f.imageUrl = img; changed = true; }
    }
    if (changed) await f.save();
  }

  // 2. Ensure Admin, User, and Hidden sample foods exist so NO filter tab in Quản lý món ăn is empty
  const extraSampleFoods = [
    {
      classId: 'admin_bun_cha_ha_noi',
      name: 'Bún chả Hà Nội',
      category: 'bun_pho',
      source: 'admin',
      imageUrl: '/food-images/manual/bun-cha-ha-noi.jpg',
      ingredients: 'Bún tươi, thịt ba chỉ và chả viên nướng than hoa, đu đủ xanh ngâm chua, rau sống và nước mắm ấm.',
      cookingMethod: 'Ướp thịt heo với nước hàng, hành tỏi rồi nướng trên than hồng, dùng kèm bún rối và nước chấm chua ngọt.',
      mealTime: 'Buổi trưa (món đặc sản cân đối đạm, tinh bột và rau xanh).',
      nutritionPer100g: { kcal: 145, protein: 8.2, carb: 16.5, fat: 5.1, fiber: 1.5 },
      servingSizes: [
        { label: 'Nhỏ 340g', grams: 340, isDefault: false },
        { label: 'Vừa 450g', grams: 450, isDefault: true },
        { label: 'Lớn 560g', grams: 560, isDefault: false },
      ],
      isActive: true,
    },
    {
      classId: 'admin_com_ga_hoi_an',
      name: 'Cơm gà Hội An',
      category: 'com',
      source: 'admin',
      imageUrl: '/food-images/manual/com-ga-hoi-an.jpg',
      ingredients: 'Gạo nấu nước luộc gà nghệ vàng, thịt gà ta xé phay, hành tây, rau răm, đu đủ chua và nước mắm tỏi ớt.',
      cookingMethod: 'Luộc gà ta chín tới lấy nước nấu cơm nghệ dẻo thơm, xé thịt gà trộn hành tây, rau răm và cốt chanh.',
      mealTime: 'Buổi trưa hoặc buổi tối.',
      nutritionPer100g: { kcal: 168, protein: 10.4, carb: 21.0, fat: 4.6, fiber: 1.2 },
      servingSizes: [
        { label: 'Nhỏ 300g', grams: 300, isDefault: false },
        { label: 'Vừa 400g', grams: 400, isDefault: true },
        { label: 'Lớn 500g', grams: 500, isDefault: false },
      ],
      isActive: true,
    },
    {
      classId: 'user_chao_ga',
      name: 'Cháo gà nấm hương',
      category: 'other',
      source: 'user',
      imageUrl: '/food-images/manual/chao-ga.jpg',
      ingredients: 'Gạo tẻ pha nếp, thịt ức gà xé, nấm hương, hành lá, tía tô, gừng thái chỉ và tiêu xay.',
      cookingMethod: 'Ninh nhừ gạo với nước luộc gà ngọt thanh, thêm nấm hương và thịt gà xé nhỏ, ăn nóng giải cảm.',
      mealTime: 'Buổi sáng hoặc bữa tối nhẹ bụng.',
      nutritionPer100g: { kcal: 78, protein: 5.5, carb: 10.8, fat: 1.4, fiber: 0.8 },
      servingSizes: [
        { label: 'Nhỏ 300g', grams: 300, isDefault: false },
        { label: 'Vừa 400g', grams: 400, isDefault: true },
        { label: 'Lớn 500g', grams: 500, isDefault: false },
      ],
      isActive: true,
    },
    {
      classId: 'user_dau_hu_sot_ca',
      name: 'Đậu hũ sốt cà chua',
      category: 'other',
      source: 'user',
      imageUrl: '/food-images/manual/dau-hu-sot-ca-chua.jpg',
      ingredients: 'Đậu hũ non rán vàng nhẹ, cà chua chín mọng, hành tím, hành lá và gia vị vừa ăn.',
      cookingMethod: 'Áp chảo đậu hũ vàng đều, rim nhỏ lửa trong sốt cà chua tươi đến khi thấm mềm đậm vị.',
      mealTime: 'Buổi trưa hoặc buổi tối thanh đạm.',
      nutritionPer100g: { kcal: 112, protein: 7.2, carb: 6.5, fat: 6.4, fiber: 1.6 },
      servingSizes: [
        { label: 'Nhỏ 180g', grams: 180, isDefault: false },
        { label: 'Vừa 240g', grams: 240, isDefault: true },
        { label: 'Lớn 300g', grams: 300, isDefault: false },
      ],
      isActive: true,
    },
    {
      classId: 'admin_nuoc_mia_hidden',
      name: 'Nước mía tắc tươi',
      category: 'other',
      source: 'admin',
      imageUrl: '/food-images/nuoc-mia.jpg',
      ingredients: 'Mía cây ép nguyên chất, trái tắc (quất) tươi và đá viên.',
      cookingMethod: 'Ép mía tươi cùng tắc thơm lấy nước uống giải nhiệt tức thì.',
      mealTime: 'Bữa phụ buổi trưa nắng (nhiều đường tự nhiên, hạn chế khi giảm cân).',
      nutritionPer100g: { kcal: 72, protein: 0.2, carb: 18.0, fat: 0.0, fiber: 0.0 },
      servingSizes: [
        { label: 'Nhỏ 250g', grams: 250, isDefault: false },
        { label: 'Vừa 350g', grams: 350, isDefault: true },
        { label: 'Lớn 500g', grams: 500, isDefault: false },
      ],
      isActive: false,
      deletedAt: new Date(Date.now() - 2 * 86400000),
    },
  ];

  for (const item of extraSampleFoods) {
    const exists = await Food.findOne({ classId: item.classId });
    if (!exists) {
      await Food.create(item);
    }
  }

  // 3. Enrich main users (huongtk, quynhntd, admin) with active 24h notes, targets & today's meals
  const adminUser = await User.findOne({ role: 'admin', isActive: true });
  const huong = await User.findOne({ email: 'huongtk.23itb@vku.udn.vn' });
  const quynh = await User.findOne({ email: 'quynhntd.23itb@vku.udn.vn' });

  const now = new Date();
  const exp24h = new Date(now.getTime() + 23 * 3600 * 1000);

  if (huong) {
    huong.gender = huong.gender || 'female';
    huong.birthYear = huong.birthYear || 2005;
    huong.activityLevel = huong.activityLevel || 'light';
    huong.goal = huong.goal || 'lose';
    if (!huong.targets?.kcal) {
      huong.targets = { bmr: 1205, tdee: 1657, kcal: 1350, protein: 85, carb: 160, fat: 38 };
    }
    huong.note = {
      text: 'Ăn sạch sống khỏe mỗi ngày!',
      createdAt: now,
      expiresAt: exp24h,
    };
    await huong.save();

    // Ensure BodyMetric history (at least 4 entries across the month so weight trend works cleanly)
    const bmCount = await BodyMetric.countDocuments({ userId: huong._id });
    if (bmCount < 4) {
      const weights = [
        { daysAgo: 21, weightKg: 48.4, heightCm: 158 },
        { daysAgo: 14, weightKg: 47.9, heightCm: 158 },
        { daysAgo: 7, weightKg: 47.4, heightCm: 158 },
        { daysAgo: 0, weightKg: 47.0, heightCm: 158 },
      ];
      for (const w of weights) {
        await BodyMetric.create({
          userId: huong._id,
          heightCm: w.heightCm,
          weightKg: w.weightKg,
          recordedAt: new Date(now.getTime() - w.daysAgo * 86400000),
        });
      }
    }

    // Ensure today has logged meals so Home screen & Stats today are rich and never empty!
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayMealCount = await Meal.countDocuments({ userId: huong._id, eatenAt: { $gte: todayStart } });
    if (todayMealCount === 0) {
      const fPho = await Food.findOne({ classId: 'pho' }).lean();
      const fBanhCuon = await Food.findOne({ classId: 'banh_cuon' }).lean();
      const fGoiCuon = await Food.findOne({ classId: 'goi_cuon' }).lean();

      const todayEntries = [
        {
          food: fBanhCuon,
          mealType: 'breakfast',
          hour: 7,
          min: 35,
          grams: 200,
          label: 'Vừa 200g',
          nut: { kcal: 330, protein: 13, carb: 52, fat: 8, fiber: 2 },
          k: 1.0,
          conf: 96,
        },
        {
          food: fPho,
          mealType: 'lunch',
          hour: 12,
          min: 15,
          grams: 485,
          label: 'Vừa 485g',
          nut: { kcal: 427, protein: 24, carb: 58, fat: 11, fiber: 2 },
          k: 0.97,
          conf: 98,
        },
        {
          food: fGoiCuon,
          mealType: 'snack',
          hour: 16,
          min: 10,
          grams: 160,
          label: 'Vừa 160g',
          nut: { kcal: 180, protein: 10, carb: 28, fat: 3, fiber: 2 },
          k: 1.0,
          conf: 94,
        },
      ];

      for (const e of todayEntries) {
        if (!e.food) continue;
        const ts = new Date(now);
        ts.setHours(e.hour, e.min, 0, 0);

        const pred = await AiPrediction.create({
          userId: huong._id,
          modelVersion: 'YOLOv8-Detector(Model 1) + FoodCls-30(Model 2) + PortionNet-EffB0(Model 3)',
          bowlCount: 1,
          detected: true,
          top3: [
            { classId: e.food.classId, confidence: e.conf, k: e.k, grams: e.grams },
            { classId: 'hu_tieu', confidence: 100 - e.conf - 1, k: 1.0, grams: 500 },
            { classId: 'bun_rieu', confidence: 1, k: 1.0, grams: 500 },
          ],
          inferenceMs: 148,
          status: 'confirmed',
          createdAt: ts,
        });

        const meal = await Meal.create({
          userId: huong._id,
          mealType: e.mealType,
          eatenAt: ts,
          note: e.food.name,
          totals: e.nut,
        });

        await MealItem.create({
          mealId: meal._id,
          userId: huong._id,
          foodId: e.food._id,
          foodName: e.food.name,
          predictionId: pred._id,
          imageUrl: e.food.imageUrl,
          portionLabel: e.label,
          portionGrams: e.grams,
          nutrition: e.nut,
          isCorrected: false,
          createdAt: ts,
        });
      }
    }
  }

  if (quynh) {
    quynh.note = {
      text: 'Đang theo chế độ cân bằng dinh dưỡng',
      createdAt: now,
      expiresAt: exp24h,
    };
    await quynh.save();
  }

  if (adminUser) {
    adminUser.note = {
      text: 'Trực vận hành hệ thống SmartFood',
      createdAt: now,
      expiresAt: exp24h,
    };
    await adminUser.save();
  }

  // 4. Ensure Feedbacks have BOTH pending AND resolved records so neither tab is empty!
  const fBunRieu = await Food.findOne({ classId: 'bun_rieu' }).lean();
  const fMiQuang = await Food.findOne({ classId: 'mi_quang' }).lean();
  const fBanhKhot = await Food.findOne({ classId: 'banh_khot' }).lean();

  const resolvedFbCount = await Feedback.countDocuments({ status: 'resolved' });
  if (resolvedFbCount === 0 && huong && adminUser && fBunRieu && fMiQuang) {
    const p1 = await AiPrediction.create({
      userId: huong._id,
      modelVersion: 'YOLOv8-Detector(Model 1) + FoodCls-30(Model 2) + PortionNet-EffB0(Model 3)',
      bowlCount: 1,
      detected: true,
      top3: [
        { classId: 'bun_bo_hue', confidence: 64, k: 0.96, grams: 576 },
        { classId: 'bun_rieu', confidence: 31, k: 0.98, grams: 490 },
        { classId: 'bun_mam', confidence: 5, k: 1.0, grams: 550 },
      ],
      inferenceMs: 162,
      status: 'confirmed',
      createdAt: new Date(now.getTime() - 2 * 86400000),
    });

    await Feedback.create({
      predictionId: p1._id,
      userId: huong._id,
      predictedClass: 'bun_bo_hue',
      correctFoodId: fBunRieu._id,
      comment: 'Tô bún riêu cua chụp dưới đèn vàng nên AI nhầm nước dùng sang bún bò Huế.',
      status: 'resolved',
      adminNote: 'Đã xác nhận ảnh thiếu sáng ấm màu, đưa vào tập dữ liệu bổ sung cho lớp bun_rieu.',
      handledBy: adminUser._id,
      handledAt: new Date(now.getTime() - 86400000),
    });

    const p2 = await AiPrediction.create({
      userId: huong._id,
      modelVersion: 'YOLOv8-Detector(Model 1) + FoodCls-30(Model 2) + PortionNet-EffB0(Model 3)',
      bowlCount: 1,
      detected: true,
      top3: [
        { classId: 'cao_lau', confidence: 58, k: 1.02, grams: 459 },
        { classId: 'mi_quang', confidence: 37, k: 1.01, grams: 505 },
        { classId: 'bun_thit_nuong', confidence: 5, k: 1.0, grams: 450 },
      ],
      inferenceMs: 154,
      status: 'confirmed',
      createdAt: new Date(now.getTime() - 3 * 86400000),
    });

    await Feedback.create({
      predictionId: p2._id,
      userId: huong._id,
      predictedClass: 'cao_lau',
      correctFoodId: fMiQuang._id,
      comment: 'Mì Quảng gà không có bánh đa trên mặt nên bị đoán thành Cao lầu.',
      status: 'resolved',
      adminNote: 'Đã duyệt và gắn nhãn chuẩn mi_quang phục vụ xuất CSV fine-tune.',
      handledBy: adminUser._id,
      handledAt: new Date(now.getTime() - 2 * 86400000),
    });
  }

  const pendingFbCount = await Feedback.countDocuments({ status: 'pending' });
  if (pendingFbCount < 2 && huong && fBanhKhot) {
    const p3 = await AiPrediction.create({
      userId: huong._id,
      modelVersion: 'YOLOv8-Detector(Model 1) + FoodCls-30(Model 2) + PortionNet-EffB0(Model 3)',
      bowlCount: 1,
      detected: true,
      top3: [
        { classId: 'banh_can', confidence: 66, k: 0.95, grams: 143 },
        { classId: 'banh_khot', confidence: 29, k: 0.98, grams: 176 },
        { classId: 'banh_beo', confidence: 5, k: 1.0, grams: 150 },
      ],
      inferenceMs: 149,
      status: 'confirmed',
      createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
    });

    await Feedback.create({
      predictionId: p3._id,
      userId: huong._id,
      predictedClass: 'banh_can',
      correctFoodId: fBanhKhot._id,
      comment: 'Đĩa bánh khọt Vũng Tàu có tôm đỏ và cốt dừa nhưng góc chụp xa giống bánh căn.',
      status: 'pending',
    });
  }

  // 5. Ensure Recommendations collection has realistic records
  const recCount = await Recommendation.countDocuments();
  if (recCount === 0 && huong) {
    await Recommendation.insertMany([
      {
        userId: huong._id,
        type: 'daily',
        basedOn: { totalKcal: 937, targetKcal: 1350 },
        content: 'Hôm nay bạn đã nạp 937/1.350 kcal (còn 413 kcal). Bữa tối nên ưu tiên Canh chua cá hoặc Đậu hũ sốt cà chua ăn kèm nửa chén cơm để đủ đạm mà không vượt mục tiêu giảm cân.',
        llmModel: 'Qwen2.5-3B-Instruct-LoRA-RAG',
      },
      {
        userId: huong._id,
        type: 'meal',
        basedOn: { totalKcal: 427, targetKcal: 1350 },
        content: 'Tô Phở bò buổi trưa (485g - 427 kcal) cung cấp 24g đạm rất hợp lý cho hoạt động buổi chiều.',
        llmModel: 'Qwen2.5-3B-Instruct-LoRA-RAG',
      },
    ]);
  }

  // 6. Add AuditLog entries if needed so all 4 filter tabs (Food, User, Feedback, AiPrediction) are rich
  if (adminUser) {
    const auditFoodCount = await AuditLog.countDocuments({ targetType: 'Food' });
    if (auditFoodCount < 8) {
      await AuditLog.create({
        adminId: adminUser._id,
        action: 'UPDATE_FOOD_IMAGE',
        targetType: 'Food',
        targetId: 'system_30_classes',
        summary: 'Đồng bộ hình ảnh chuẩn và thành phần chế biến cho danh mục 30 món ăn Việt Nam',
      });
    }
  }

  console.log('ENRICH ALL DATA COMPLETED SUCCESSFULLY!');
} catch (err) {
  console.error('enrichAllData error:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
