import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { orderRateLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';
import { advanceOrderStatus, cancelOrder, getOrderById, getOrders, placeOrder, rateOrder, reorder } from '../controller/orderController.js';

const router = express.Router();

router.post('/', requireSignIn, orderRateLimiter, validate(schemas.placeOrder), placeOrder);
router.get('/', requireSignIn, getOrders);
router.get('/:id', requireSignIn, getOrderById);
router.post('/:id/cancel', requireSignIn, validate(schemas.cancelOrder), cancelOrder);
router.patch('/:id/advance', requireSignIn, advanceOrderStatus);
router.post('/:id/rate', requireSignIn, validate(schemas.rateOrder), rateOrder);
router.post('/:id/reorder', requireSignIn, reorder);

export default router;