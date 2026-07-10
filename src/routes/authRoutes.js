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

const router = express.Router();

router.post('/register', register);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOtp);

export default router;