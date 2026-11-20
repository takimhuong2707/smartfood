import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import User from './src/models/User.js';

async function main() {
  console.log('1. Đang kết nối MongoDB để lấy thông tin tài khoản test...');
  await mongoose.connect(env.mongoUri);

  let user = await User.findOne({ isActive: true });
  if (!user) {
    user = await User.findOne();
  }

  const userId = user ? user._id : new mongoose.Types.ObjectId();
  const token = jwt.sign({ id: userId, role: user?.role || 'user' }, env.jwtSecret, {
    expiresIn: '1h',
  });

  console.log(`2. Đã tạo token test cho user: ${user ? user.fullName || user.email : 'Demo User'}`);

  const question = 'Hôm nay mình ăn 1 tô phở thì còn bao nhiêu kcal?';
  console.log(`3. Đang gửi câu hỏi tới Backend: "${question}" ...`);

  try {
    const res = await fetch(`http://localhost:${env.port}/api/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    console.log('\n================== KẾT QUẢ PHẢN HỒI ==================');
    console.log('Mã HTTP Status:', res.status);
    console.log('Dữ liệu trả về:');
    console.log(JSON.stringify(data, null, 2));
    console.log('======================================================');
  } catch (err) {
    console.error('\n❌ Không kết nối được với server backend:', err.message);
    console.log('👉 Hãy đảm bảo bạn đã chạy "npm run dev" ở một terminal khác trước!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
