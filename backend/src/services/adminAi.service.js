import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import MealItem from '../models/MealItem.js';
import AiPrediction from '../models/AiPrediction.js';
import AppError from '../utils/AppError.js';
import { recordAuditLog } from '../utils/auditLog.js';
import { invalidateStatsCache } from './adminStats.service.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseVnDateRange(from, to) {
  let startDate = null;
  let endDate = null;
  if (from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new AppError(400, 'Ngày bắt đầu (from) không hợp lệ (YYYY-MM-DD)');
    startDate = new Date(`${from}T00:00:00.000+07:00`);
    if (Number.isNaN(startDate.getTime())) throw new AppError(400, 'Ngày bắt đầu không hợp lệ');
  }
  if (to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new AppError(400, 'Ngày kết thúc (to) không hợp lệ (YYYY-MM-DD)');
    endDate = new Date(`${to}T23:59:59.999+07:00`);
    if (Number.isNaN(endDate.getTime())) throw new AppError(400, 'Ngày kết thúc không hợp lệ');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new AppError(400, 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
  }
  return { startDate, endDate };
}

function csvCell(val) {
  let s = val === null || val === undefined ? '' : String(val);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ==================== FEEDBACK ====================
export async function listFeedbacks({ status = '', search = '', page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = {};

  if (status === 'pending') filter.status = { $ne: 'resolved' };
  else if (status === 'resolved') filter.status = 'resolved';

  if (typeof search === 'string' && search.trim()) {
    filter.predictedClass = { $regex: escapeRegex(search.trim()), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('correctFoodId', 'name aiClassId')
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  const normalized = items.map((f) => ({
    ...f,
    status: f.status === 'resolved' ? 'resolved' : 'pending',
  }));

  return {
    items: normalized,
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) || 1 },
  };
}

export async function getFeedbackById(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID feedback không hợp lệ');
  const fb = await Feedback.findById(id)
    .populate('predictionId', 'top3 modelVersion status createdAt')
    .populate('correctFoodId', 'name aiClassId classId')
    .populate('handledBy', 'fullName')
    .lean();
  if (!fb) throw new AppError(404, 'Không tìm thấy feedback');
  return { ...fb, status: fb.status === 'resolved' ? 'resolved' : 'pending' };
}

export async function updateFeedback(adminId, id, payload) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID feedback không hợp lệ');
  const fb = await Feedback.findById(id);
  if (!fb) throw new AppError(404, 'Không tìm thấy feedback');

  const prevStatus = fb.status === 'resolved' ? 'resolved' : 'pending';
  const prevNote = fb.adminNote || '';

  if (payload.status !== undefined) {
    if (payload.status !== 'pending' && payload.status !== 'resolved') {
      throw new AppError(400, 'Trạng thái feedback không hợp lệ');
    }
    fb.status = payload.status;
    if (payload.status === 'resolved') {
      fb.handledBy = adminId;
      fb.handledAt = new Date();
    } else {
      fb.handledBy = undefined;
      fb.handledAt = undefined;
    }
  }

  if (payload.adminNote !== undefined) {
    if (typeof payload.adminNote !== 'string') throw new AppError(400, 'Ghi chú không hợp lệ');
    const cleanNote = payload.adminNote.trim();
    if (cleanNote.length > 500) throw new AppError(400, 'Ghi chú tối đa 500 ký tự');
    fb.adminNote = cleanNote;
  }

  await fb.save();
  invalidateStatsCache();

  await recordAuditLog({
    adminId,
    action: 'UPDATE_FEEDBACK',
    targetType: 'Feedback',
    targetId: fb._id,
    summary: `status: ${prevStatus} -> ${fb.status}${prevNote !== (fb.adminNote || '') ? ', cập nhật ghi chú' : ''}`,
  });

  return fb;
}

// ==================== PREDICTIONS ====================
const MAX_CORRECTED_IDS = 10000;

function buildPredictionMatch({ from, to, maxConfidence, predictedClass, status }) {
  const match = {};
  const { startDate, endDate } = parseVnDateRange(from, to);
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }
  if (status === 'pending' || status === 'confirmed' || status === 'discarded') {
    match.status = status;
  }
  if (typeof predictedClass === 'string' && predictedClass.trim()) {
    match['top3.0.classId'] = { $regex: escapeRegex(predictedClass.trim()), $options: 'i' };
  }
  if (maxConfidence !== undefined && maxConfidence !== '') {
    const num = Number(maxConfidence);
    if (!Number.isFinite(num) || num < 0 || num > 1) {
      throw new AppError(400, 'Ngưỡng độ tin cậy phải nằm trong khoảng [0, 1]');
    }
    match.$or = [
      { 'top3.0.confidence': { $lte: num } },
      { 'top3.0.confidence': { $gt: 1, $lte: num * 100 } },
    ];
  }
  return match;
}

function buildPredictionPipeline({ from, to, maxConfidence, predictedClass, status, correctedOnly }) {
  const match = buildPredictionMatch({ from, to, maxConfidence, predictedClass, status });

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1, _id: 1 } },
    {
      $lookup: {
        from: 'mealitems',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $eq: ['$isCorrected', true] }] } } },
          { $limit: 1 },
          { $project: { foodId: 1 } },
        ],
        as: 'correctedMeals',
      },
    },
    {
      $lookup: {
        from: 'feedbacks',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $ne: ['$correctFoodId', null] }] } } },
          { $limit: 1 },
          { $project: { correctFoodId: 1 } },
        ],
        as: 'correctedFeedbacks',
      },
    },
    {
      $addFields: {
        isCorrected: {
          $or: [{ $gt: [{ $size: '$correctedMeals' }, 0] }, { $gt: [{ $size: '$correctedFeedbacks' }, 0] }],
        },
        resolvedFoodId: {
          $ifNull: [
            { $arrayElemAt: ['$correctedFeedbacks.correctFoodId', 0] },
            { $arrayElemAt: ['$correctedMeals.foodId', 0] },
          ],
        },
      },
    },
  ];

  if (correctedOnly === 'true' || correctedOnly === true) {
    pipeline.push({ $match: { isCorrected: true } });
  }

  return pipeline;
}

export async function listPredictions({
  from = '',
  to = '',
  maxConfidence = '',
  predictedClass = '',
  status = '',
  correctedOnly = '',
  page = 1,
  limit = 20,
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const match = buildPredictionMatch({ from, to, maxConfidence, predictedClass, status });
  let truncated = false;

  if (correctedOnly === 'true' || correctedOnly === true) {
    const [mealPredIds, fbPredIds] = await Promise.all([
      MealItem.distinct('predictionId', { isCorrected: true, predictionId: { $ne: null } }),
      Feedback.distinct('predictionId', { correctFoodId: { $ne: null }, predictionId: { $ne: null } }),
    ]);
    const idSet = new Set();
    for (const pid of mealPredIds) idSet.add(String(pid));
    for (const pid of fbPredIds) idSet.add(String(pid));

    const allIds = Array.from(idSet);
    if (allIds.length > MAX_CORRECTED_IDS) {
      truncated = true;
    }
    const cappedIds = allIds.slice(0, MAX_CORRECTED_IDS).map((id) => new mongoose.Types.ObjectId(id));
    match._id = { $in: cappedIds };
  }

  const [items, total] = await Promise.all([
    AiPrediction.aggregate([
      { $match: match },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: (safePage - 1) * safeLimit },
      { $limit: safeLimit },
      {
        $lookup: {
          from: 'mealitems',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $eq: ['$isCorrected', true] }] } } },
            { $limit: 1 },
            { $project: { foodId: 1 } },
          ],
          as: 'correctedMeals',
        },
      },
      {
        $lookup: {
          from: 'feedbacks',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $ne: ['$correctFoodId', null] }] } } },
            { $limit: 1 },
            { $project: { correctFoodId: 1 } },
          ],
          as: 'correctedFeedbacks',
        },
      },
      {
        $addFields: {
          isCorrected: {
            $or: [{ $gt: [{ $size: '$correctedMeals' }, 0] }, { $gt: [{ $size: '$correctedFeedbacks' }, 0] }],
          },
          resolvedFoodId: {
            $ifNull: [
              { $arrayElemAt: ['$correctedFeedbacks.correctFoodId', 0] },
              { $arrayElemAt: ['$correctedMeals.foodId', 0] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'foods',
          localField: 'resolvedFoodId',
          foreignField: '_id',
          as: 'correctedFood',
        },
      },
      {
        $project: {
          _id: 1,
          modelVersion: 1,
          bowlCount: 1,
          detected: 1,
          top3: 1,
          inferenceMs: 1,
          status: 1,
          isCorrected: 1,
          createdAt: 1,
          correctedFood: {
            $let: {
              vars: { cf: { $arrayElemAt: ['$correctedFood', 0] } },
              in: {
                $cond: [{ $ifNull: ['$$cf', false] }, { _id: '$$cf._id', name: '$$cf.name', aiClassId: '$$cf.aiClassId' }, null],
              },
            },
          },
        },
      },
    ]),
    AiPrediction.countDocuments(match),
  ]);

  return {
    items,
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) || 1 },
    ...(truncated ? { truncated: true } : {}),
  };
}

export async function getPredictionById(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID prediction không hợp lệ');
  const res = await AiPrediction.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, fullName: 1 } }],
        as: 'userArr',
      },
    },
    {
      $lookup: {
        from: 'mealitems',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $eq: ['$isCorrected', true] }] } } },
          { $limit: 1 },
          { $project: { foodId: 1 } },
        ],
        as: 'correctedMeals',
      },
    },
    {
      $lookup: {
        from: 'feedbacks',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$predictionId', '$$pid'] }, { $ne: ['$correctFoodId', null] }] } } },
          { $limit: 1 },
          { $project: { correctFoodId: 1 } },
        ],
        as: 'correctedFeedbacks',
      },
    },
    {
      $addFields: {
        isCorrected: {
          $or: [{ $gt: [{ $size: '$correctedMeals' }, 0] }, { $gt: [{ $size: '$correctedFeedbacks' }, 0] }],
        },
        resolvedFoodId: {
          $ifNull: [
            { $arrayElemAt: ['$correctedFeedbacks.correctFoodId', 0] },
            { $arrayElemAt: ['$correctedMeals.foodId', 0] },
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'foods',
        localField: 'resolvedFoodId',
        foreignField: '_id',
        as: 'correctedFoodArr',
      },
    },
    {
      $project: {
        _id: 1,
        modelVersion: 1,
        bowlCount: 1,
        detected: 1,
        top3: 1,
        inferenceMs: 1,
        status: 1,
        isCorrected: 1,
        createdAt: 1,
        user: { $arrayElemAt: ['$userArr', 0] },
        correctedFood: {
          $let: {
            vars: { cf: { $arrayElemAt: ['$correctedFoodArr', 0] } },
            in: {
              $cond: [{ $ifNull: ['$$cf', false] }, { _id: '$$cf._id', name: '$$cf.name', aiClassId: '$$cf.aiClassId' }, null],
            },
          },
        },
      },
    },
  ]);
  if (!res[0]) throw new AppError(404, 'Không tìm thấy bản ghi dự đoán');
  return res[0];
}

export async function exportPredictions(adminId, { format = 'csv', from = '', to = '', limit = 5000 }) {
  const safeFormat = format === 'json' ? 'json' : 'csv';
  const safeLimit = Math.min(5000, Math.max(1, Number(limit) || 5000));
  const basePipeline = buildPredictionPipeline({ from, to, correctedOnly: true });

  const cursor = AiPrediction.aggregate([
    ...basePipeline,
    { $limit: safeLimit + 1 },
    {
      $lookup: {
        from: 'foods',
        localField: 'resolvedFoodId',
        foreignField: '_id',
        as: 'correctedFoodArr',
      },
    },
    {
      $project: {
        _id: 1,
        top3: 1,
        createdAt: 1,
        correctedAiClassId: { $arrayElemAt: ['$correctedFoodArr.aiClassId', 0] },
      },
    },
  ]).cursor({ batchSize: 200 });

  const rows = [];
  let skippedCustomFood = 0;
  let truncated = false;

  for await (const doc of cursor) {
    if (rows.length >= safeLimit) {
      truncated = true;
      break;
    }
    if (!doc.correctedAiClassId) {
      skippedCustomFood++;
      continue;
    }
    const top1 = doc.top3?.[0] || {};
    rows.push({
      predictionId: String(doc._id),
      predictedClass: top1.classId || '',
      confidence: top1.confidence ?? '',
      correctedAiClassId: doc.correctedAiClassId,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
    });
  }

  await recordAuditLog({
    adminId,
    action: 'EXPORT_PREDICTIONS',
    targetType: 'AiPrediction',
    targetId: 'export',
    summary: `Xuất ${rows.length} dòng (${safeFormat}), bỏ qua ${skippedCustomFood} món tự thêm`,
  });

  if (safeFormat === 'json') {
    return {
      format: 'json',
      meta: { totalRows: rows.length, skippedCustomFood, truncated },
      rows,
    };
  }

  const header = ['predictionId', 'predictedClass', 'confidence', 'correctedAiClassId', 'createdAt'].join(',');
  const lines = rows.map((r) =>
    [r.predictionId, r.predictedClass, r.confidence, r.correctedAiClassId, r.createdAt].map(csvCell).join(',')
  );
  const csv = '\uFEFF' + [header, ...lines].join('\n');

  return {
    format: 'csv',
    meta: { totalRows: rows.length, skippedCustomFood, truncated },
    csv,
  };
}
