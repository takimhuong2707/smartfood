// Gọi server chatbot chạy trên Colab (qua ngrok). Dùng fetch có sẵn trong Node 18+.

export class ChatbotUnavailableError extends Error {}

export async function askChatbot({ question, profile, meals, lastMeal, history }) {
  const CHATBOT_URL = (process.env.CHATBOT_URL || '').replace(/\/+$/, '');
  const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY || '';
  const TIMEOUT_MS = Number(process.env.CHATBOT_TIMEOUT_MS || 60000);

  if (!CHATBOT_URL || !CHATBOT_API_KEY) {
    throw new ChatbotUnavailableError('Chưa cấu hình CHATBOT_URL hoặc CHATBOT_API_KEY trong file .env');
  }

  let res;
  try {
    res = await fetch(`${CHATBOT_URL}/chat_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CHATBOT_API_KEY,
        // ngrok bản free cần header này để bỏ qua trang interstitial cảnh báo
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        question,
        profile,
        meals,
        last_meal: lastMeal || null,
        history: history || null,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Colab ngắt, URL ngrok đổi, mạng lỗi hoặc timeout
    throw new ChatbotUnavailableError(`Không gọi được server chatbot: ${err.message}`);
  }

  if (!res.ok) {
    const ngrokErr = res.headers.get('ngrok-error-code');
    const detail = await res.text().catch(() => '');
    if (ngrokErr || detail.includes('ERR_NGROK_3200') || (res.status === 404 && detail.includes('ngrok'))) {
      throw new ChatbotUnavailableError(
        'Đường dẫn Colab ngrok hiện đang Offline hoặc phiên Colab đã kết thúc (ERR_NGROK_3200). ' +
        'Vui lòng vào Google Colab, chạy lại ô server và copy CHATBOT_URL mới vào file backend/.env'
      );
    }
    throw new ChatbotUnavailableError(`Server chatbot trả lỗi ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  if (typeof data.answer !== 'string' || !data.answer) {
    throw new ChatbotUnavailableError('Server chatbot trả dữ liệu không hợp lệ');
  }

  return data; // { answer, canh_bao }
}
