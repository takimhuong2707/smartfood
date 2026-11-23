import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/food-images', express.static('public/food-images'));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler); // luôn đặt cuối cùng

export default app;
