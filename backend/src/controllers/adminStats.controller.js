import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminStatsService from '../services/adminStats.service.js';

export const getStats = asyncHandler(async (req, res) => {
  res.json(await adminStatsService.getAdminStats(req.query));
});
