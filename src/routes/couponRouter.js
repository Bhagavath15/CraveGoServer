import express from "express";
import {
    getAvailableCoupons,
    validateCoupon,
    removeCoupon,
} from "../controller/couponController.js";

import { requireSignIn } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireSignIn, getAvailableCoupons);
router.post("/validate", requireSignIn, validateCoupon);
router.post("/remove", requireSignIn, removeCoupon);

export default router;
