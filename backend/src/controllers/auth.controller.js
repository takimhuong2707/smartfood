import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

// req.body ?? {} : tránh lỗi khi client gửi request không có body
export const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body ?? {}));
});

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body ?? {}));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await authService.getMe(req.user.id) });
});