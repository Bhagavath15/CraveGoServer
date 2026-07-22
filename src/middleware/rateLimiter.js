import rateLimit from "express-rate-limit";

export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many OTP attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
