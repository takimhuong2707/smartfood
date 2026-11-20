import { Router } from 'express';
import { chat, getHistory } from '../controllers/chatbot.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// Yêu cầu đăng nhập
router.use(auth);

// POST /api/chatbot (gửi câu hỏi)
router.post('/', chat);

// GET /api/chatbot/history (lấy lịch sử chat)
router.get('/history', getHistory);

export default router;
