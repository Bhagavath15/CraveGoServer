import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
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

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:8080', 'http://localhost:3000'];

app.use(cors({ origin: allowedOrigins }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
});
app.use(globalLimiter);

app.post('/payment/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
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

app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`, err.stack?.split('\n').slice(0, 2).join('\n'));
    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? "Something went wrong. Please try again later." : err.message,
    });
});

const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    io.close(() => console.log('Socket.IO server closed'));
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
    gracefulShutdown('unhandledRejection');
});

server.listen(PORT, () => {
    console.log(`Server is connected ${PORT}`)
})
