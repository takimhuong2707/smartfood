import { asyncHandler } from '../utils/asyncHandler.js';
import * as mealService from '../services/meal.service.js';
import AppError from '../utils/AppError.js';

export const predict = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'Vui lòng tải lên file ảnh');
  }
  const result = await mealService.predictMealImage(
    req.user.id,
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname
  );
  res.json(result);
});

export const save = asyncHandler(async (req, res) => {
  const result = await mealService.saveMeal(req.user.id, req.body ?? {});
  res.status(201).json(result);
});

export const getFoods = asyncHandler(async (req, res) => {
  res.json(await mealService.getAllFoods());
});

export const addManualFood = asyncHandler(async (req, res) => {
  const food = await mealService.createUserFood(req.user.id, req.body ?? {});
  res.status(201).json(food);
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const fb = await mealService.createFeedback(req.user.id, req.body ?? {});
  res.status(201).json(fb);
});
