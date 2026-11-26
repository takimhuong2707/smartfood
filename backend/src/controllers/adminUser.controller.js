import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminUserService from '../services/adminUser.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  res.json(await adminUserService.listUsers(req.query));
});

export const getUserDetail = asyncHandler(async (req, res) => {
  res.json(await adminUserService.getUserDetail(req.params.id));
});

export const updateUser = asyncHandler(async (req, res) => {
  res.json(await adminUserService.updateUser(req.user.id, req.params.id, req.body ?? {}));
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  res.json(await adminUserService.resetUserPassword(req.user.id, req.params.id, req.body ?? {}));
});
