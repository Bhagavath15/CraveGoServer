import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRouter from './routes/authRoutes.js';
import restaurantRouter from './routes/restaurantRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import addressRouter from './routes/addressRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import connectDb from './config/db.js';
import paymentRouter from './routes/paymentRouter.js';
import userRouter from './routes/userRoutes.js';
import favouriteRouter from './routes/favouriteRoutes.js';
import { handleStripeWebhook } from './controller/paymentController.js';
import couponRoutes from "./routes/couponRouter.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
connectDb();

app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:3000'] }));

app.post('/payment/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: ['http://localhost:8080', 'http://localhost:3000'], methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch {
        next(new Error('Invalid or expired token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
        socket.join(userId);
    }
    socket.on('disconnect', () => { });
});

app.set('io', io);

app.use('/', authRouter);
app.use('/restaurants', restaurantRouter)
app.use('/cart', cartRouter);
app.use('/address', addressRouter);
app.use('/orders', orderRouter);
app.use('/payment', paymentRouter);
app.use('/user', userRouter);
app.use('/favorites', favouriteRouter);
app.use("/coupon", couponRoutes);
app.use("/banners", bannerRoutes);
app.use("/notification", notificationRoutes);

const PORT = process.env.PORT

app.get('/', (req, res) => {
    res.send('Hello world')
})

server.listen(PORT, () => {
    console.log(`Server is connected ${PORT}`)
})
