import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.get('/me', auth, ctrl.me);

export default router;