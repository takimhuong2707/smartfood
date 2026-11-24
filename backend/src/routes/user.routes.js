import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { auth } from '../middlewares/auth.js';
import * as ctrl from '../controllers/user.controller.js';
import AppError from '../utils/AppError.js';

const AVATAR_DIR = path.resolve(process.cwd(), 'public/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    cb(null, `${req.user?.id || 'u'}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      return cb(new AppError(400, 'Chỉ chấp nhận ảnh jpg, png hoặc webp'));
    }
    cb(null, true);
  },
});

function handleAvatarUpload(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'Kích thước ảnh đại diện tối đa 5MB'));
      }
      return next(new AppError(400, err.message));
    }
    return next(err);
  });
}

const router = Router();

router.use(auth); // Tất cả route user đều yêu cầu đăng nhập

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/avatar', handleAvatarUpload, ctrl.uploadAvatar);
router.put('/note', ctrl.saveNote);
router.delete('/note', ctrl.removeNote);
router.get('/today-summary', ctrl.getTodaySummary);
router.get('/statistics', ctrl.getStatistics);
router.post('/weight', ctrl.recordWeight);

export default router;
