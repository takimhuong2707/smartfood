import mongoose from 'mongoose';
import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import Meal from '../models/Meal.js';
import AiPrediction from '../models/AiPrediction.js';
import AppError from '../utils/AppError.js';
import { recordAuditLog } from '../utils/auditLog.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listUsers({ search = '', role = '', isActive = '', page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = {};

  if (typeof search === 'string' && search.trim()) {
    const rx = escapeRegex(search.trim());
    filter.$or = [
      { fullName: { $regex: rx, $options: 'i' } },
      { email: { $regex: rx, $options: 'i' } },
    ];
  }

  if (role === 'user' || role === 'admin') {
    filter.role = role;
  }
  if (isActive === 'true') filter.isActive = true;
  else if (isActive === 'false') filter.isActive = false;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('_id email fullName role isActive createdAt')
      .sort({ createdAt: -1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

export async function getUserDetail(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID người dùng không hợp lệ');

  const user = await User.findById(id)
    .select('_id email fullName role isActive gender birthYear activityLevel goal targets createdAt')
    .lean();
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const [latestMetric, mealCount, scanCount, lastMeal, lastScan] = await Promise.all([
    BodyMetric.findOne({ userId: id }).sort({ recordedAt: -1 }).lean(),
    Meal.countDocuments({ userId: id }),
    AiPrediction.countDocuments({ userId: id }),
    Meal.findOne({ userId: id }).sort({ eatenAt: -1 }).select('eatenAt').lean(),
    AiPrediction.findOne({ userId: id }).sort({ createdAt: -1 }).select('createdAt').lean(),
  ]);

  const dates = [lastMeal?.eatenAt, lastScan?.createdAt, user.createdAt]
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  const lastActiveAt = dates.length > 0 ? new Date(Math.max(...dates)) : null;

  return {
    ...user,
    latestMetric: latestMetric
      ? { heightCm: latestMetric.heightCm, weightKg: latestMetric.weightKg, recordedAt: latestMetric.recordedAt }
      : null,
    stats: {
      mealCount,
      scanCount,
      lastActiveAt,
    },
  };
}

export async function updateUser(adminId, id, payload) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'ID người dùng không hợp lệ');

  const user = await User.findById(id).select('_id email fullName role isActive');
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');

  const hasIsActive = typeof payload.isActive === 'boolean';
  const hasRole = payload.role === 'user' || payload.role === 'admin';

  if (payload.isActive !== undefined && !hasIsActive) {
    throw new AppError(400, 'Giá trị isActive không hợp lệ');
  }
  if (payload.role !== undefined && !hasRole) {
    throw new AppError(400, 'Giá trị role không hợp lệ');
  }
  if (!hasIsActive && !hasRole) {
    throw new AppError(400, 'Không có trường hợp lệ để cập nhật');
  }

  if (String(adminId) === String(user._id)) {
    if (hasIsActive && payload.isActive === false) {
      throw new AppError(400, 'Không thể tự khóa tài khoản của chính mình');
    }
    if (hasRole && payload.role !== 'admin') {
      throw new AppError(400, 'Không thể tự hạ quyền quản trị của chính mình');
    }
  }

  const nextIsActive = hasIsActive ? payload.isActive : user.isActive;
  const nextRole = hasRole ? payload.role : user.role;

  // Nếu đang là admin hoạt động mà bị khóa hoặc hạ quyền -> kiểm tra còn admin nào khác không
  if (user.role === 'admin' && user.isActive && (!nextIsActive || nextRole !== 'admin')) {
    const otherActiveAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: 'admin',
      isActive: true,
    });
    if (otherActiveAdmins === 0) {
      throw new AppError(409, 'Không thể khóa hoặc hạ quyền quản trị viên cuối cùng');
    }
  }

  const prevIsActive = user.isActive;
  const prevRole = user.role;

  const changes = [];
  if (hasIsActive && payload.isActive !== user.isActive) {
    changes.push(`isActive: ${user.isActive} -> ${payload.isActive}`);
    user.isActive = payload.isActive;
  }
  if (hasRole && payload.role !== user.role) {
    changes.push(`role: ${user.role} -> ${payload.role}`);
    user.role = payload.role;
  }

  await user.save();

  if (prevRole === 'admin' && prevIsActive && (!user.isActive || user.role !== 'admin')) {
    const remainingActiveAdmins = await User.countDocuments({
      role: 'admin',
      isActive: true,
    });
    if (remainingActiveAdmins === 0) {
      user.isActive = prevIsActive;
      user.role = prevRole;
      await user.save();
      throw new AppError(409, 'Không thể khóa hoặc hạ quyền quản trị viên cuối cùng');
    }
  }

  if (changes.length > 0) {
    await recordAuditLog({
      adminId,
      action: 'UPDATE_USER',
      targetType: 'User',
      targetId: user._id,
      summary: `Cập nhật ${user.email}: ${changes.join(', ')}`,
    });
  }

  return {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
  };
}
