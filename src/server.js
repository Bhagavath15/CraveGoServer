import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './routes/authRoutes.js';
import restaurantRouter from './routes/restaurantRoutes.js';
import connectDb from './config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
connectDb();

app.use(cors());
app.use(express.json());

app.use('/', authRouter);
app.use('/restaurants', restaurantRouter)

const PORT = process.env.PORT

app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(PORT, () => {
    console.log(`Server is connected ${PORT}`)
})
