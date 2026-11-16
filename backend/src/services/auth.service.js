import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import BodyMetric from '../models/BodyMetric.js';
import AppError from '../utils/AppError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (u) =>
  jwt.sign({ id: u._id, role: u.role }, env.jwtSecret, { expiresIn: env.jwtExpires });

const toPublicUser = (u, metric = null) => ({
  id: u._id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  hasProfile: Boolean(u.targets?.kcal),
  gender: u.gender,
  birthYear: u.birthYear,
  activityLevel: u.activityLevel,
  goal: u.goal,
  targets: u.targets,
  latestMetric: metric
    ? {
        heightCm: metric.heightCm,
        weightKg: metric.weightKg,
        recordedAt: metric.recordedAt,
      }
    : undefined,
});

export async function register({ email, password, fullName }) {
  // Chỉ nhận chuỗi, chặn NoSQL Injection kiểu { "$ne": null }
  if ([email, password, fullName].some((v) => typeof v !== 'string'))
    throw new AppError(400, 'Dữ liệu không hợp lệ');

  const cleanFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!cleanFullName) throw new AppError(400, 'Vui lòng nhập họ tên');
  if (!EMAIL_RE.test(normalizedEmail)) throw new AppError(400, 'Email không hợp lệ');
  if (password.length < 6) throw new AppError(400, 'Mật khẩu tối thiểu 6 ký tự');

  if (await User.findOne({ email: normalizedEmail }))
    throw new AppError(409, 'Email đã được sử dụng');

  const user = await User.create({
    email: normalizedEmail,
    fullName: cleanFullName,
    passwordHash: await bcrypt.hash(password, 10),
  });
  return { token: signToken(user), user: toPublicUser(user) };
}

export async function login({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string')
    throw new AppError(400, 'Dữ liệu không hợp lệ');

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new AppError(401, 'Sai email hoặc mật khẩu');
  if (!user.isActive) throw new AppError(403, 'Tài khoản đã bị khóa');

  const metric = await BodyMetric.findOne({ userId: user._id }).sort({ recordedAt: -1 });
  return { token: signToken(user), user: toPublicUser(user, metric) };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new AppError(401, 'Tài khoản không hợp lệ');
  const metric = await BodyMetric.findOne({ userId }).sort({ recordedAt: -1 });
  return toPublicUser(user, metric);
}