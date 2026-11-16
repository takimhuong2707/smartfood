import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

await connectDB();
app.listen(env.port, '0.0.0.0', () => console.log(`API chạy ở cổng ${env.port}`));