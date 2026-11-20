import { askChatbot, ChatbotUnavailableError } from '../services/chatbot.service.js';
import {
  buildChatInput,
  displayName,
  getWeeklyMeals,
} from '../services/chatbotContext.service.js';
import ChatMessage from '../models/ChatMessage.js';

const FALLBACK =
  'Chatbot hiện chưa sẵn sàng. Bạn xem mục thống kê dinh dưỡng trong ứng dụng hoặc thử lại sau ít phút nhé.';

function removeAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Bữa vừa chụp nhưng chưa lưu: do app gửi lên, kiểm tra kỹ trước khi chuyển tiếp.
function sanitizeLastMeal(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const num = (v, max) => Math.min(Math.max(Number(v) || 0, 0), max);
  return raw.slice(0, 10).map((it) => ({
    ten: String(displayName(it)).slice(0, 80),
    gram: num(it.gram, 3000),
    kcal: num(it.kcal, 5000),
    protein_g: num(it.protein_g, 500),
  }));
}

// Trả lời câu hỏi về danh tính, tên, thể trạng cá nhân
function handleProfileQuestion(user) {
  if (!user) {
    return 'Mình chưa tìm thấy hồ sơ của bạn. Bạn hãy vào tab Hồ sơ để cập nhật thông tin nhé!';
  }

  const name = user.fullName || 'Bạn';
  const gender = user.gender === 'female' ? 'Nữ' : user.gender === 'male' ? 'Nam' : 'Chưa cập nhật';
  const currentYear = new Date().getFullYear();
  const age = user.birthYear ? currentYear - Number(user.birthYear) : null;
  const ageStr = age ? `${age} tuổi (sinh năm ${user.birthYear})` : 'Chưa cập nhật';

  const heightStr = user.heightCm ? `${user.heightCm} cm` : 'Chưa cập nhật';
  const weightStr = user.weightKg ? `${user.weightKg} kg` : 'Chưa cập nhật';

  let bmiStr = '';
  if (user.heightCm && user.weightKg) {
    const h = user.heightCm / 100;
    const bmiVal = (user.weightKg / (h * h)).toFixed(1);
    let bmiNote = 'Thể trạng cân đối';
    if (bmiVal < 18.5) bmiNote = 'Thể trạng hơi gầy';
    else if (bmiVal >= 25) bmiNote = 'Thể trạng thừa cân';
    bmiStr = ` (BMI: ${bmiVal} - ${bmiNote})`;
  }

  const actMap = {
    sedentary: 'Ít vận động (ngồi nhiều)',
    light: 'Vận động nhẹ (đi lại nhẹ, 1-3 ngày/tuần)',
    moderate: 'Vận động vừa (tập thể dục 3-5 ngày/tuần)',
    active: 'Vận động nhiều (tập thể thao 6-7 ngày/tuần)',
    very_active: 'Vận động rất nhiều (cường độ cao)',
  };
  const actStr = actMap[user.activityLevel] || 'Vận động nhẹ';

  const goalMap = {
    lose: 'Giảm cân',
    maintain: 'Duy trì cân nặng',
    gain_muscle: 'Tăng cơ bắp',
    balanced: 'Cân bằng dinh dưỡng',
  };
  const goalStr = goalMap[user.goal] || 'Giảm cân';

  const targetKcal = user.targets?.kcal || 1200;
  const bmr = user.targets?.bmr ? `${user.targets.bmr} kcal` : null;
  const tdee = user.targets?.tdee ? `${user.targets.tdee} kcal` : null;

  return (
    `Chào bạn ${name}! Dưới đây là thông tin hồ sơ của bạn trên SmartFood:\n` +
    `• Họ và tên: ${name}\n` +
    `• Giới tính: ${gender}\n` +
    `• Độ tuổi: ${ageStr}\n` +
    `• Chiều cao: ${heightStr} | Cân nặng: ${weightStr}${bmiStr}\n` +
    `• Mức độ vận động: ${actStr}\n` +
    `• Mục tiêu hiện tại: ${goalStr}\n` +
    `• Mục tiêu năng lượng: ${targetKcal.toLocaleString('vi-VN')} kcal/ngày` +
    (bmr && tdee ? ` (BMR: ${bmr}, TDEE: ${tdee})\n` : '\n') +
    `\nHồ sơ của bạn đã được kết nối với trợ lý. Bạn có thể hỏi mình bất kỳ câu hỏi nào về gợi ý thực đơn hôm nay nhé!`
  );
}

// Trả lời câu hỏi về lịch sử bữa ăn trong tuần / những ngày qua
function handleWeeklyMealsQuestion(weekly) {
  if (!weekly || !weekly.days || weekly.days.length === 0) {
    return (
      'Trong vòng 1 tuần qua, hệ thống chưa ghi nhận bữa ăn nào từ bạn.\n' +
      'Bạn hãy dùng tính năng chụp món ăn trên ứng dụng để lưu lại nhật ký dinh dưỡng mỗi ngày nhé!'
    );
  }

  let text = `Dưới đây là thống kê các bữa ăn của bạn trong 7 ngày qua:\n\n`;

  for (const day of weekly.days) {
    text += `📅 ${day.dateLabel} (${day.meals.length} bữa - Tổng: ${day.totalKcal.toLocaleString('vi-VN')} kcal):\n`;
    for (const m of day.meals) {
      text += `   • ${m.bua} (${m.time}): ${m.mon} - ${m.kcal} kcal\n`;
    }
    text += `\n`;
  }

  const avgKcal = Math.round(weekly.totalKcal / weekly.days.length);
  text +=
    `📊 Tổng cộng: ${weekly.totalMeals} bữa ăn ghi nhận trong ${weekly.days.length} ngày, ` +
    `tổng năng lượng: ${weekly.totalKcal.toLocaleString('vi-VN')} kcal (trung bình ~${avgKcal.toLocaleString('vi-VN')} kcal/ngày).\n` +
    `Hãy tiếp tục duy trì chụp món đều đặn để theo dõi dinh dưỡng chính xác nhất!`;

  return text;
}

export async function chat(req, res) {
  const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length > 500) {
    return res.status(400).json({ message: 'Câu hỏi phải từ 1 đến 500 ký tự' });
  }

  try {
    const userId = req.user?.id || req.user?._id;
    const { user, profile, meals } = await buildChatInput(userId);

    const normQ = removeAccents(question);

    // 1) Kiểm tra xem người dùng có hỏi về tên, danh tính, thông tin hồ sơ không
    const isProfileQuery =
      normQ.includes('toi ten gi') ||
      normQ.includes('ten toi la gi') ||
      normQ.includes('ten cua toi') ||
      normQ.includes('toi la ai') ||
      normQ.includes('ho so cua toi') ||
      normQ.includes('thong tin cua toi') ||
      normQ.includes('toi bao nhieu tuoi') ||
      normQ.includes('chieu cao cua toi') ||
      normQ.includes('can nang cua toi') ||
      normQ.includes('the trang cua toi') ||
      normQ.includes('chi so cua toi') ||
      normQ.includes('muc tieu cua toi') ||
      normQ.includes('muc tieu calo');

    if (isProfileQuery && user) {
      const answer = handleProfileQuestion(user);
      if (userId) {
        await Promise.allSettled([
          ChatMessage.create({ userId, role: 'user', content: question }),
          ChatMessage.create({ userId, role: 'assistant', content: answer }),
        ]);
      }
      return res.json({
        answer,
        warnings: [],
        profileUsed: true,
        mealsCount: meals.length,
      });
    }

    // 2) Kiểm tra xem người dùng có hỏi về số bữa ăn trong tuần / lịch sử ăn uống
    const isWeeklyQuery =
      normQ.includes('1 tuan') ||
      normQ.includes('mot tuan') ||
      normQ.includes('tuan nay') ||
      normQ.includes('tuan qua') ||
      normQ.includes('may bua') ||
      normQ.includes('so bua an') ||
      normQ.includes('lich su an') ||
      normQ.includes('an gi trong tuan') ||
      normQ.includes('da an nhung gi') ||
      normQ.includes('hom qua toi an gi') ||
      normQ.includes('cac bua an');

    if (isWeeklyQuery && userId) {
      const weekly = await getWeeklyMeals(userId);
      const answer = handleWeeklyMealsQuestion(weekly);
      await Promise.allSettled([
        ChatMessage.create({ userId, role: 'user', content: question }),
        ChatMessage.create({ userId, role: 'assistant', content: answer }),
      ]);
      return res.json({
        answer,
        warnings: [],
        profileUsed: true,
        mealsCount: weekly.totalMeals,
      });
    }

    // 3) Lấy 4 tin nhắn gần nhất làm history nếu client không gửi (rút gọn ký tự để tránh tràn context)
    let history = req.body.history;
    if (!history && userId) {
      const recentMessages = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
      if (recentMessages.length > 0) {
        history = recentMessages.reverse().map((m) => ({
          role: m.role,
          content: String(m.content || '').slice(0, 200),
        }));
      }
    }

    const data = await askChatbot({
      question,
      profile,
      meals,
      lastMeal: sanitizeLastMeal(req.body.lastMeal),
      history,
    });

    // Lưu vào lịch sử ChatMessage trong MongoDB
    if (userId) {
      await Promise.allSettled([
        ChatMessage.create({ userId, role: 'user', content: question }),
        ChatMessage.create({ userId, role: 'assistant', content: data.answer }),
      ]);
    }

    return res.json({
      answer: data.answer,
      warnings: data.canh_bao || [],
      profileUsed: Boolean(profile),
      mealsCount: meals.length,
    });
  } catch (err) {
    console.error('[chatbot]', err.message);
    if (err instanceof ChatbotUnavailableError) {
      return res.status(503).json({ answer: FALLBACK, error: 'chatbot_unavailable', detail: err.message });
    }
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ', detail: err.message });
  }
}

export async function getHistory(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const messages = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    return res.json({ messages });
  } catch (err) {
    return res.status(500).json({ message: 'Không thể lấy lịch sử chat' });
  }
}
