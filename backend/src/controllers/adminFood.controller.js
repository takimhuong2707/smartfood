import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminFoodService from '../services/adminFood.service.js';

export const listFoods = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.listFoods(req.query));
});

export const getFoodById = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.getFoodById(req.params.id));
});

export const createFood = asyncHandler(async (req, res) => {
  const food = await adminFoodService.createFood(req.user.id, req.body ?? {});
  res.status(201).json(food);
});

export const updateFood = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.updateFood(req.user.id, req.params.id, req.body ?? {}));
});

export const deleteFood = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.deleteFood(req.user.id, req.params.id));
});

export const restoreFood = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.restoreFood(req.user.id, req.params.id));
});

export const uploadFoodImage = asyncHandler(async (req, res) => {
  res.json(await adminFoodService.updateFoodImage(req.user.id, req.params.id, req.file));
});
