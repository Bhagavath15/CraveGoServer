import express from "express";
import {
    getAvailableCoupons,
    validateCoupon,
    removeCoupon,
} from "../controller/couponController.js";

import { requireSignIn } from "../middleware/authMiddleware.js";
import { validate, schemas } from "../middleware/validate.js";

const router = express.Router();

router.get("/", requireSignIn, getAvailableCoupons);
router.post("/validate", requireSignIn, validate(schemas.validateCoupon), validateCoupon);
router.post("/remove", requireSignIn, removeCoupon);

export default router;
