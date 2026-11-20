import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  res.json(await userService.getProfile(req.user.id));
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json(await userService.updateProfile(req.user.id, req.body ?? {}));
});

export const getTodaySummary = asyncHandler(async (req, res) => {
  res.json(await userService.getTodaySummary(req.user.id, req.query.date));
});

export const getStatistics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  res.json(await userService.getStatistics(req.user.id, days));
});

export const recordWeight = asyncHandler(async (req, res) => {
  const { weightKg } = req.body;
  res.json(await userService.recordWeight(req.user.id, weightKg));
});
