import 'dotenv/config';

process.env.MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Thiếu biến môi trường: ${key}`);
}

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: '7d',
  aiUrl: process.env.AI_URL || 'http://127.0.0.1:8000',
};