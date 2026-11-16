import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';

export function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, env.jwtSecret); // { id, role }
    next();
  } catch {
    next(new AppError(401, 'Chưa đăng nhập hoặc phiên hết hạn'));
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return next(new AppError(403, 'Không có quyền truy cập'));
  next();
}