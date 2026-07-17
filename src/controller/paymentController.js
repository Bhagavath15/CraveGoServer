import stripe from "../config/stripe.js";
import cartModel from "../models/cart.js";

export const createPaymentIntent = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });
        
        if (!cart) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        try {
            const existing = await stripe.paymentIntents.search({
                query: `metadata['userId']:'${userId.toString()}' AND status:'requires_payment_method'`,
                limit: 10,
            });
            for (const pi of existing.data) {
                await stripe.paymentIntents.cancel(pi.id).catch(() => {});
            }
        } catch (_) {}

        const stripeAmount = Math.round(cart.grandTotal * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: stripeAmount,
            currency: 'inr',
            capture_method: 'manual',
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: userId.toString(),
                cartId: cart._id.toString(),
            },
        });

        return res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong."
        });
    }
};