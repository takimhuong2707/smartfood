import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminAuditService from '../services/adminAudit.service.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  res.json(await adminAuditService.listAuditLogs(req.query));
});
