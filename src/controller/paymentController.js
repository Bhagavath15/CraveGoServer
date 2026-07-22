import stripe from "../config/stripe.js";
import cartModel from "../models/cart.js";
import orderModel from "../models/orderModel.js";
import { sendPushNotification } from "../services/notification.service.js";

const FREE_DELIVERY_MIN_AMOUNT = 500;
const DELIVERY_FEE = 40;
const GST_PERCENTAGE = 5;

export const createPaymentIntent = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        let serverSubtotal = 0;
        for (const item of cart.items) {
            const customizationTotal = (item.customization || item.customizations || []).reduce(
                (sum, opt) => sum + (opt.price || 0), 0
            );
            const unitPrice = item.price + customizationTotal;
            serverSubtotal += Math.round(unitPrice * item.quantity * 100) / 100;
        }

        const deliveryFee = serverSubtotal >= FREE_DELIVERY_MIN_AMOUNT ? 0 : DELIVERY_FEE;
        const tax = Math.round(serverSubtotal * (GST_PERCENTAGE / 100) * 100) / 100;
        const discount = cart.discount || 0;
        const serverGrandTotal = Math.round((serverSubtotal + deliveryFee + tax - discount) * 100) / 100;

        const clientGrandTotal = cart.grandTotal || 0;
        if (Math.abs(serverGrandTotal - clientGrandTotal) > 1) {
            return res.status(400).json({
                success: false,
                message: "Amount mismatch detected. Please refresh your cart."
            });
        }

        try {
            const existing = await stripe.paymentIntents.search({
                query: `metadata['userId']:'${userId.toString()}' AND status:'requires_payment_method'`,
                limit: 10,
            });
            for (const pi of existing.data) {
                await stripe.paymentIntents.cancel(pi.id).catch(() => { });
            }
        } catch (_) { }

        const stripeAmount = Math.round(serverGrandTotal * 100);
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

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(500).json({ message: "Webhook secret not configured" });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const pi = event.data.object;
                const order = await orderModel.findOne({ paymentIntentId: pi.id });
                if (order) {
                    await orderModel.findOneAndUpdate(
                        { paymentIntentId: pi.id },
                        {
                            $set: {
                                paymentStatus: "Paid",
                                transactionId: pi.charges?.data?.[0]?.balance_transaction || null,
                                paymentTimestamp: new Date(),
                            },
                        }
                    );
                    sendPushNotification({
                        userId: order.userId,
                        type: "PAYMENT",
                        title: "Payment Successful",
                        message: `Your payment of ₹${order.grandTotal} has been completed successfully.`,
                        data: { orderId: String(order._id), screen: "TrackOrder" },
                    });
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const pi = event.data.object;
                const order = await orderModel.findOne({ paymentIntentId: pi.id });
                if (order) {
                    await orderModel.findOneAndUpdate(
                        { paymentIntentId: pi.id },
                        { $set: { paymentStatus: "Failed" } }
                    );
                    sendPushNotification({
                        userId: order.userId,
                        type: "PAYMENT",
                        title: "Payment Failed",
                        message: `Your payment of ₹${order.grandTotal} could not be processed. Please try again.`,
                        data: { orderId: String(order._id), screen: "TrackOrder" },
                    });
                }
                break;
            }

            case "payment_intent.canceled": {
                const pi = event.data.object;
                const order = await orderModel.findOne({ paymentIntentId: pi.id });
                if (order && order.paymentStatus !== "Refunded") {
                    await orderModel.findOneAndUpdate(
                        { paymentIntentId: pi.id },
                        { $set: { paymentStatus: "Failed" } }
                    );
                }
                break;
            }
        }
    } catch (err) {
        console.error("Stripe webhook processing error:", err.message);
    }

    return res.status(200).json({ received: true });
};
