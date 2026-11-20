import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import User from './src/models/User.js';
import { chat } from './src/controllers/chatbot.controller.js';

async function testChatbotDirectly() {
  await mongoose.connect(env.mongoUri);

  const user = await User.findOne({ email: 'huongtk.23itb@vku.udn.vn' });
  const reqUser = { id: user._id };

  const testCases = [
    'Tôi tên gì',
    'Ghi ra số bữa ăn trong vòng 1 tuần của tôi',
  ];

  for (const q of testCases) {
    console.log(`\n==================================================`);
    console.log(`HỎI: "${q}"`);
    console.log(`==================================================`);

    const req = {
      user: reqUser,
      body: { question: q },
    };

    let resultJson = null;
    let statusCode = 200;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resultJson = data;
        return this;
      },
    };

    await chat(req, res);
    console.log(`HTTP ${statusCode}`);
    console.log(`TRẢ LỜI:`);
    console.log(resultJson?.answer);
  }

  process.exit(0);
}

testChatbotDirectly().catch((err) => {
  console.error(err);
  process.exit(1);
});
