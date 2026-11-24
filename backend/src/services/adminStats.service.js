import User from '../models/User.js';
import Meal from '../models/Meal.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';
import Feedback from '../models/Feedback.js';
import AppError from '../utils/AppError.js';

const CACHE_TTL_MS = 60 * 1000;
const statsCache = new Map();

export function invalidateStatsCache() {
  statsCache.clear();
}

function getVnDateStrings(days) {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnNow = new Date(now.getTime() + vnOffsetMs);
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(vnNow.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export async function getAdminStats({ range = '7', refresh = '0' }) {
  const rangeNum = Number(range);
  if (range !== undefined && range !== '' && rangeNum !== 7 && rangeNum !== 30) {
    throw new AppError(400, 'Tham số range chỉ nhận 7 hoặc 30');
  }
  const days = rangeNum === 30 ? 30 : 7;
  const bypassCache = refresh === '1' || refresh === 'true';

  const cached = statsCache.get(days);
  if (!bypassCache && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const dateKeys = getVnDateStrings(days);
  const startDate = new Date(`${dateKeys[0]}T00:00:00.000+07:00`);

  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    totalMeals,
    totalScans,
    totalFeedbacks,
    dailyUsersAgg,
    dailyScansAgg,
    dailyMealsAgg,
    topFoodsAgg,
    aiQualityAgg,
    mealCorrectionAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    Meal.countDocuments(),
    AiPrediction.countDocuments(),
    Feedback.countDocuments({ status: { $ne: 'resolved' } }),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, count: { $sum: 1 } } },
    ]),
    AiPrediction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, count: { $sum: 1 } } },
    ]),
    Meal.aggregate([
      { $match: { eatenAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$eatenAt', timezone: '+07:00' } }, count: { $sum: 1 } } },
    ]),
    AiPrediction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $project: { topClass: { $arrayElemAt: ['$top3.classId', 0] } } },
      { $match: { topClass: { $ne: null } } },
      { $group: { _id: '$topClass', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'foods',
          localField: '_id',
          foreignField: 'classId',
          as: 'food',
        },
      },
      { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          classId: '$_id',
          name: { $ifNull: ['$food.name', '$_id'] },
          count: 1,
          _id: 0,
        },
      },
    ]),
    AiPrediction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $project: { conf: { $arrayElemAt: ['$top3.confidence', 0] } } },
      { $match: { conf: { $ne: null } } },
      {
        $project: {
          confPct: { $cond: [{ $lte: ['$conf', 1] }, { $multiply: ['$conf', 100] }, '$conf'] },
        },
      },
      { $group: { _id: null, avgConfidence: { $avg: '$confPct' } } },
    ]),
    MealItem.aggregate([
      { $match: { createdAt: { $gte: startDate }, predictionId: { $ne: null } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          corrected: { $sum: { $cond: ['$isCorrected', 1, 0] } },
        },
      },
    ]),
  ]);

  const uMap = new Map(dailyUsersAgg.map((d) => [d._id, d.count]));
  const sMap = new Map(dailyScansAgg.map((d) => [d._id, d.count]));
  const mMap = new Map(dailyMealsAgg.map((d) => [d._id, d.count]));

  const dailySeries = dateKeys.map((date) => ({
    date,
    newUsers: uMap.get(date) || 0,
    scans: sMap.get(date) || 0,
    meals: mMap.get(date) || 0,
  }));

  const avgConfidence = aiQualityAgg[0]?.avgConfidence
    ? Number(aiQualityAgg[0].avgConfidence.toFixed(1))
    : 0;
  const mc = mealCorrectionAgg[0];
  const correctionRate = mc && mc.total > 0 ? Number(((mc.corrected / mc.total) * 100).toFixed(1)) : 0;

  const data = {
    range: days,
    overview: {
      totalUsers,
      activeUsers,
      lockedUsers,
      totalMeals,
      totalScans,
      totalFeedbacks,
    },
    dailySeries,
    topFoods: topFoodsAgg,
    aiQuality: {
      avgConfidence,
      correctionRate,
    },
  };

  statsCache.set(days, { ts: Date.now(), data });
  return { ...data, cached: false };
}
