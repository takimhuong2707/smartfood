import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Food from '../models/Food.js';

const foodNamesPath = path.resolve(process.cwd(), 'src/data/foodNames.json');
const aiClasses = new Set(Object.keys(JSON.parse(fs.readFileSync(foodNamesPath, 'utf-8'))));

try {
  await connectDB();
  const foods = await Food.find({});
  let updated = 0;

  for (const f of foods) {
    let changed = false;
    if (f.isActive === undefined) {
      f.isActive = true;
      changed = true;
    }
    if (!f.aiClassId && aiClasses.has(f.classId)) {
      f.aiClassId = f.classId;
      changed = true;
    }
    if (!f.source) {
      f.source = aiClasses.has(f.classId) ? 'system' : 'user';
      changed = true;
    }
    if (changed) {
      await f.save();
      updated++;
    }
  }
  console.log(`Migrate hoàn tất: đã cập nhật ${updated}/${foods.length} món.`);
} catch (err) {
  console.error('Lỗi migrateFoods:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
