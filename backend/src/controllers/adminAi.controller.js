import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminAiService from '../services/adminAi.service.js';

export const listFeedbacks = asyncHandler(async (req, res) => {
  res.json(await adminAiService.listFeedbacks(req.query));
});

export const getFeedbackById = asyncHandler(async (req, res) => {
  res.json(await adminAiService.getFeedbackById(req.params.id));
});

export const updateFeedback = asyncHandler(async (req, res) => {
  res.json(await adminAiService.updateFeedback(req.user.id, req.params.id, req.body ?? {}));
});

export const listPredictions = asyncHandler(async (req, res) => {
  res.json(await adminAiService.listPredictions(req.query));
});

export const getPredictionById = asyncHandler(async (req, res) => {
  res.json(await adminAiService.getPredictionById(req.params.id));
});

export const exportPredictions = asyncHandler(async (req, res) => {
  const result = await adminAiService.exportPredictions(req.user.id, req.query);
  res.setHeader('X-Total-Rows', String(result.meta.totalRows));
  res.setHeader('X-Skipped-Custom-Food', String(result.meta.skippedCustomFood));
  res.setHeader('X-Truncated', String(result.meta.truncated));

  if (result.format === 'json') {
    return res.json(result);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="predictions_retrain.csv"');
  return res.send(result.csv);
});
