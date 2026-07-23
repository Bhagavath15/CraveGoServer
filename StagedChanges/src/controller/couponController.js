import cartModel from "../models/cart.js";
import * as CouponService from "../services/coupon.service.js";

export const getAvailableCoupons = async (req, res) => {
    try {
        const { restaurantId, subtotal = 0 } = req.query;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID is required",
            });
        }

        const coupons = await CouponService.getAvailableCoupons({
            userId: req.user.id || req.user._id,
            restaurantId,
            subtotal: Number(subtotal),
        });

        return res.status(200).json({
            success: true,
            message: "Coupons fetched successfully",
            data: coupons,
        });
    } catch (error) {
        console.error("Get Coupons Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch coupons",
        });
    }
};

export const validateCoupon = async (req, res) => {
    try {
        const {
            couponCode,
            restaurantId,
            subtotal,
            deliveryFee = 0,
            tax = 0,
        } = req.body;

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required",
            });
        }

        const result = await CouponService.validateCoupon({
            userId: req.user.id || req.user._id,
            couponCode,
            restaurantId,
            subtotal,
            deliveryFee,
            tax,
        });

        const userId = req.user.id || req.user._id;

        const round2 = (n) => Math.round(n * 100) / 100;
        await cartModel.findOneAndUpdate(
            { userId },
            {
                $set: {
                    discount: result.discount,
                    couponId: result.couponId || null,
                    couponCode: result.couponCode || "",
                    couponTitle: result.couponTitle || "",
                    couponType: result.couponType || "",
                    grandTotal: round2(result.grandTotal),
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            data: result,
        });
    } catch (error) {
        console.error("Validate Coupon Error:", error);

        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getCouponCount = async (req, res) => {
    try {
        const now = new Date();
        const count = await CouponService.getCouponCount(now);
        return res.status(200).json({ success: true, count });
    } catch (error) {
        console.error("Get Coupon Count Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch coupon count" });
    }
};

export const removeCoupon = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const round2 = (n) => Math.round(n * 100) / 100;
        const cart = await cartModel.findOne({ userId });
        if (cart) {
            cart.discount = 0;
            cart.couponId = null;
            cart.couponCode = "";
            cart.couponTitle = "";
            cart.couponType = "";
            cart.grandTotal = round2(cart.subtotal + cart.deliveryFee + cart.tax);
            await cart.save();
        }
        return res.status(200).json({ success: true, message: "Coupon removed" });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove coupon." });
    }
};
