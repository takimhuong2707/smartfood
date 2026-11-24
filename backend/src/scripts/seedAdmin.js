import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!email || !password) {
  console.error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong biến môi trường.');
  process.exit(1);
}

try {
  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.isActive = true;
    await existing.save();
    console.log(`Đã cập nhật quyền admin cho tài khoản: ${email}`);
  } else {
    await User.create({
      email,
      fullName: 'Administrator',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      isActive: true,
    });
    console.log(`Đã tạo tài khoản admin mới: ${email}`);
  }
} catch (err) {
  console.error('Lỗi seed admin:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
