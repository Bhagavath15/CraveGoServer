import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { orderRateLimiter } from '../middleware/rateLimiter.js';
import { advanceOrderStatus, cancelOrder, getOrderById, getOrders, placeOrder } from '../controller/orderController.js';

const router = express.Router();

router.post('/', requireSignIn, orderRateLimiter, placeOrder);
router.get('/', requireSignIn, getOrders);
router.get('/:id', requireSignIn, getOrderById);
router.post('/:id/cancel', requireSignIn, cancelOrder);
router.patch('/:id/advance', requireSignIn, advanceOrderStatus);

export default router;