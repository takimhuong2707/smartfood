import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

export async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, env.jwtSecret); // { id, role }
    const userId = decoded?.id ?? decoded?._id;
    if (!userId) return next(new AppError(401, 'Chưa đăng nhập hoặc phiên hết hạn'));

    const user = await User.findById(userId).select('role isActive');
    if (!user || !user.isActive) {
      return next(new AppError(401, 'Chưa đăng nhập hoặc phiên hết hạn'));
    }

    req.user = { ...decoded, id: String(user._id), role: user.role };
    next();
  } catch {
    next(new AppError(401, 'Chưa đăng nhập hoặc phiên hết hạn'));
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id ?? req.user?._id;
    if (!userId) return next(new AppError(403, 'Không có quyền truy cập'));

    const user = await User.findById(userId).select('role isActive');
    if (!user || !user.isActive || user.role !== 'admin') {
      return next(new AppError(403, 'Không có quyền truy cập'));
    }

    req.user = { ...req.user, id: String(user._id), role: user.role };
    next();
  } catch {
    next(new AppError(403, 'Không có quyền truy cập'));
  }
}

export const adminOnly = requireAdmin;
