import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import mealRoutes from './meal.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/meals', mealRoutes);

export default router;