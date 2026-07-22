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
import { orderRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', orderRateLimiter, validate(schemas.register), register);
router.post('/verify-email-otp', otpRateLimiter, validate(schemas.verifyOtp), verifyEmailOtp);
router.post('/login', orderRateLimiter, validate(schemas.login), login);
router.post('/forgot-password', orderRateLimiter, validate(schemas.forgotPassword), forgotPassword);
router.post('/verify-forgot-password-otp', otpRateLimiter, validate(schemas.verifyOtp), verifyForgotPasswordOtp);
router.post('/reset-password', otpRateLimiter, validate(schemas.resetPassword), resetPassword);
router.post('/resend-otp', orderRateLimiter, validate(schemas.resendOtp), resendOtp);

export default router;