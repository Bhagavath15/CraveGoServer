import Joi from "joi";

export const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const message = error.details.map((d) => d.message).join("; ");
        return res.status(400).json({ success: false, message });
    }
    next();
};

export const schemas = {
    register: Joi.object({
        name: Joi.string().trim().min(1).max(100).required(),
        email: Joi.string().email().lowercase().trim().required(),
        password: Joi.string().min(6).max(128).required(),
    }),
    login: Joi.object({
        email: Joi.string().email().lowercase().trim().required(),
        password: Joi.string().required(),
    }),
    verifyOtp: Joi.object({
        email: Joi.string().email().lowercase().trim().required(),
        otp: Joi.string().length(6).required(),
    }),
    forgotPassword: Joi.object({
        email: Joi.string().email().lowercase().trim().required(),
    }),
    resetPassword: Joi.object({
        resetToken: Joi.string().required(),
        newPassword: Joi.string().min(6).max(128).required(),
    }),
    resendOtp: Joi.object({
        email: Joi.string().email().lowercase().trim().required(),
        type: Joi.string().valid("signup", "forgot_password").required(),
    }),
    address: Joi.object({
        fullName: Joi.string().trim().min(1).max(100).required(),
        mobileNumber: Joi.string().trim().min(10).max(15).required(),
        houseNumber: Joi.string().trim().min(1).max(200).required(),
        area: Joi.string().trim().min(1).max(200).required(),
        city: Joi.string().trim().min(1).max(100).required(),
        state: Joi.string().trim().min(1).max(100).required(),
        pincode: Joi.string().trim().min(4).max(10).required(),
        addressType: Joi.string().valid("Home", "Work", "Other").optional(),
        coordinates: Joi.object({
            lat: Joi.number().min(-90).max(90),
            lng: Joi.number().min(-180).max(180),
        }).optional(),
        apartment: Joi.string().allow("").max(200).optional(),
        landmark: Joi.string().allow("").max(200).optional(),
    }),
    updateProfile: Joi.object({
        name: Joi.string().trim().min(1).max(100).optional(),
        phone: Joi.string().allow("").max(15).optional(),
        notifPref: Joi.object({
            orderUpdates: Joi.boolean(),
            promotions: Joi.boolean(),
            couponAlerts: Joi.boolean(),
        }).optional(),
    }),
    addToCart: Joi.object({
        restaurantId: Joi.string().required(),
        menuItemId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).default(1),
        customization: Joi.array().items(
            Joi.object({
                id: Joi.string().optional(),
                name: Joi.string().optional(),
                price: Joi.number().min(0).optional(),
            })
        ).optional(),
        name: Joi.string().allow("").optional(),
    }),
    placeOrder: Joi.object({
        addressId: Joi.string().required(),
        paymentMethod: Joi.string().valid("COD", "UPI", "CARD","ONLINE").required(),
        paymentIntentId: Joi.string().allow("").optional(),
        idempotencyKey: Joi.string().optional(),
    }),
    rateOrder: Joi.object({
        overallRating: Joi.number().min(1).max(5).optional(),
        foodRating: Joi.number().min(0).max(5).optional(),
        riderRating: Joi.number().min(0).max(5).optional(),
        riderFeedback: Joi.array().items(Joi.string().max(100)).optional(),
        reviewText: Joi.string().allow("").max(1000).optional(),
    }),
    updateCartItem: Joi.object({
        menuItemId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).optional(),
    }),
    removeCartItem: Joi.object({
        menuItemId: Joi.string().required(),
    }),
    addFavourite: Joi.object({
        restaurantId: Joi.string().required(),
    }),
    validateCoupon: Joi.object({
        couponCode: Joi.string().required(),
        restaurantId: Joi.string().optional(),
        subtotal: Joi.number().min(0).optional(),
        deliveryFee: Joi.number().min(0).optional(),
        tax: Joi.number().min(0).optional(),
    }),
    registerToken: Joi.object({
        fcmToken: Joi.string().required(),
    }),
    cancelOrder: Joi.object({
        reason: Joi.string().allow("").max(500).optional(),
    }),
};
