import express from 'express';
import {
    register,
    verifyEmailOtp,
    login,
    forgotPassword,
    verifyForgotPasswordOtp,
    resetPassword,
    resendOtp
} from '../controller/authController.js';
import { orderRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', orderRateLimiter, register);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/login', orderRateLimiter, login);
router.post('/forgot-password', orderRateLimiter, forgotPassword);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', orderRateLimiter, resendOtp);

export default router;