import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import * as ctrl from '../controllers/user.controller.js';

const router = Router();

router.use(auth); // Tất cả route user đều yêu cầu đăng nhập

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.get('/today-summary', ctrl.getTodaySummary);

export default router;
