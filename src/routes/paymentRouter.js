import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import { createPaymentIntent } from "../controller/paymentController.js";

const router = express.Router();

router.post('/create-payment-intent', requireSignIn, createPaymentIntent)

export default router;