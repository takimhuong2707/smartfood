import { Router } from 'express';
import multer from 'multer';
import { auth } from '../middlewares/auth.js';
import * as ctrl from '../controllers/meal.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.use(auth); // Yêu cầu đăng nhập

router.post('/predict', upload.single('image'), ctrl.predict);
router.post('/save', ctrl.save);
router.get('/foods', ctrl.getFoods);

export default router;
