import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { auth, requireAdmin } from '../middlewares/auth.js';
import { adminLimiter, adminHeavyLimiter, adminStatsRefreshLimiter } from '../middlewares/rateLimit.js';
import * as foodCtrl from '../controllers/adminFood.controller.js';
import * as userCtrl from '../controllers/adminUser.controller.js';
import * as statsCtrl from '../controllers/adminStats.controller.js';
import * as aiCtrl from '../controllers/adminAi.controller.js';
import AppError from '../utils/AppError.js';

const ADMIN_IMAGE_DIR = path.resolve(process.cwd(), 'public/food-images/admin');
fs.mkdirSync(ADMIN_IMAGE_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ADMIN_IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      return cb(new AppError(400, 'Chỉ chấp nhận file ảnh jpg, png hoặc webp'));
    }
    cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'Kích thước ảnh tối đa 5MB'));
      }
      return next(new AppError(400, err.message));
    }
    return next(err);
  });
}

const router = Router();

router.use(auth, requireAdmin, adminLimiter);

router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'Admin OK', userId: req.user.id });
});

router.get('/foods', foodCtrl.listFoods);
router.get('/foods/:id', foodCtrl.getFoodById);
router.post('/foods', foodCtrl.createFood);
router.put('/foods/:id', foodCtrl.updateFood);
router.delete('/foods/:id', foodCtrl.deleteFood);
router.post('/foods/:id/image', handleUpload, foodCtrl.uploadFoodImage);

router.get('/users', userCtrl.listUsers);
router.get('/users/:id', userCtrl.getUserDetail);
router.patch('/users/:id', userCtrl.updateUser);

router.get('/stats', adminStatsRefreshLimiter, statsCtrl.getStats);

router.get('/feedbacks', aiCtrl.listFeedbacks);
router.get('/feedbacks/:id', aiCtrl.getFeedbackById);
router.patch('/feedbacks/:id', aiCtrl.updateFeedback);

router.get('/predictions/export', adminHeavyLimiter, aiCtrl.exportPredictions);
router.get('/predictions', aiCtrl.listPredictions);
router.get('/predictions/:id', aiCtrl.getPredictionById);

export default router;
