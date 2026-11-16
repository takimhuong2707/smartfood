import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  res.json(await userService.getProfile(req.user.id));
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json(await userService.updateProfile(req.user.id, req.body ?? {}));
});

export const getTodaySummary = asyncHandler(async (req, res) => {
  res.json(await userService.getTodaySummary(req.user.id));
});
