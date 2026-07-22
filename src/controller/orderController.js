import mongoose from "mongoose";
import addressDetails from "../models/addressDetails.js";
import cartModel from "../models/cart.js";
import orderModel from "../models/orderModel.js";
import restaurantModel from "../models/restaurantDetails.js";
import restaurantMenuModel from "../models/restaurantMenu.js";
import { generateOrderNumber } from "../utils/orderCounter.js";
import { ORDER_STATUS, ORDER_STATUS_TEXT, ACTIVE_STATUSES, NON_CANCELLABLE_STATUSES } from "../constants/orderStatus.js";
import stripe from "../config/stripe.js";
import { sendPushNotification } from "../services/notification.service.js";
import { incrementCouponUsage, decrementCouponUsage } from "../services/coupon.service.js";

const autoAdvanceTimers = new Map();

const DELIVERY_CONFIG = {
    FREE_DELIVERY_MIN_AMOUNT: 500,
    DELIVERY_FEE: 40,
    GST_PERCENTAGE: 5,
};

export const placeOrder = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const userId = req.user.id;

        const { addressId, paymentMethod, paymentIntentId, idempotencyKey } = req.body;

        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: "Address is required"
            })
        }

        if (idempotencyKey) {
            const existing = await orderModel.findOne({ idempotencyKey }).session(session);
            if (existing) {
                await session.abortTransaction();
                return res.status(200).json({
                    success: true,
                    message: "Order already placed.",
                    order: existing,
                    duplicate: true,
                });
            }
        }

        const address = await addressDetails.findOne({
            _id: addressId,
            userId
        })

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found.",
            });
        }

        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty.",
            });
        }

        const restaurant = await restaurantModel.findOne({
            restaurantId: cart.restaurantId,
        });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found.",
            });
        }

        if (restaurant.isOpen === false) {
            return res.status(400).json({
                success: false,
                message: "Restaurant is currently closed.",
            });
        }

        const menu = await restaurantMenuModel.findOne({
            restaurantId: cart.restaurantId,
        });

        if (menu) {
            const allMenuItemIds = new Set();
            for (const category of menu.menu) {
                for (const item of category.items) {
                    allMenuItemIds.add(item.itemId);
                }
            }
            for (const cartItem of cart.items) {
                if (!allMenuItemIds.has(cartItem.menuItemId)) {
                    return res.status(400).json({
                        success: false,
                        message: `"${cartItem.name}" is no longer available on the menu. Please remove it and try again.`,
                    });
                }
            }
        }

        let subtotal = 0;

        const orderItems = cart.items.map((item) => {
            const customizationTotal = (item.customization || item.customizations || []).reduce(
                (sum, option) => sum + (option.price || 0),
                0
            );

            const unitPrice = item.price + customizationTotal;

            const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

            subtotal += totalPrice;

            return {
                menuItemId: item.menuItemId,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                customizations: item.customization || item.customizations,
                totalPrice,
            };
        });

        const round2 = (n) => Math.round(n * 100) / 100;

        const deliveryFee =
            subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_MIN_AMOUNT
                ? 0
                : DELIVERY_CONFIG.DELIVERY_FEE;

        const tax = round2(subtotal * (DELIVERY_CONFIG.GST_PERCENTAGE / 100));

        const discount = cart.discount || 0;

        const grandTotal = round2(
            subtotal +
            deliveryFee +
            tax -
            discount
        );

        const orderNumber = await generateOrderNumber();

        const [order] = await orderModel.create(
            [
                {
                    orderNumber,
                    idempotencyKey,
                    userId,
                    restaurantId: cart.restaurantId,
                    restaurantSnapshot: {
                        name: restaurant.name,
                        image: restaurant.image,
                        rating: restaurant.rating,
                    },
                    addressId,
                    addressSnapshot: {
                        fullName: address.fullName,
                        mobileNumber: address.mobileNumber,
                        houseNumber: address.houseNumber,
                        apartment: address.apartment,
                        landmark: address.landmark,
                        area: address.area,
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                        addressType: address.addressType,
                    },
                    items: orderItems,
                    subtotal,
                    deliveryFee,
                    tax,
                    discount: cart.discount || 0,
                    couponId: cart.couponId || null,
                    couponCode: cart.couponCode || "",
                    couponTitle: cart.couponTitle || "",
                    couponType: cart.couponType || "",
                    grandTotal,
                    paymentMethod,
                    paymentStatus: paymentIntentId ? "Authorized" : "Pending",
                    paymentIntentId,
                    orderStatus: ORDER_STATUS.PLACED,
                },
            ],
            { session }
        );

        cart.items = [];
        cart.restaurantId = null;
        cart.subtotal = 0;
        cart.deliveryFee = 0;
        cart.tax = 0;
        cart.discount = 0;
        cart.grandTotal = 0;
        cart.markModified('items');
        cart.markModified('restaurantId');

        await cart.save();

        if (cart.couponId) {
            await incrementCouponUsage(cart.couponId, userId, session);
        }

        await session.commitTransaction();

        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('order:update', order);
        }

        sendPushNotification({
            userId,
            type: "ORDER",
            title: "Order Placed",
            message: `Your order #${orderNumber} has been placed successfully.`,
            data: { orderId: String(order._id), screen: "TrackOrder" },
        });

        if (cart.couponCode) {
            sendPushNotification({
                userId,
                type: "COUPON",
                title: "Coupon Applied",
                message: `Coupon ${cart.couponCode.toUpperCase()} applied! You saved ₹${cart.discount}.`,
                data: { couponCode: cart.couponCode, screen: "Orders" },
            });
        }

        return res.status(201).json({
            success: true,
            message: "Order placed successfully.",
            order,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Place Order Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to place order. Please try again.",
        });
    }
    finally {
        session.endSession();
    }

}

export const getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            orderModel
                .find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("addressId", "fullName houseNumber apartment area city landmark"),
            orderModel.countDocuments({ userId }),
        ]);

        const normalized = orders.map((doc) => {
            const plain = doc.toObject();
            plain.orderStatus = Number(plain.orderStatus);
            plain.id = plain._id;
            plain.tax = plain.tax ?? plain.taxes ?? 0;
            delete plain.taxes;
            if (plain.items) {
                plain.items = plain.items.map((item) => ({
                    ...item,
                    totalPrice: item.totalPrice ?? (item.price || 0) * (item.quantity || 1),
                }));
            }
            return plain;
        });

        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully.",
            orders: normalized,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Orders Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders.",
        });
    }

}

export const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const order = await orderModel
            .findOne({
                _id: id,
                userId,
            })
            .populate(
                "addressId",
                "fullName mobileNumber houseNumber apartment landmark area city state pincode addressType"
            );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        const plain = order.toObject();
        plain.orderStatus = Number(plain.orderStatus);
        plain.tax = plain.tax ?? plain.taxes ?? 0;
        delete plain.taxes;
        if (plain.items) {
            plain.items = plain.items.map((item) => ({
                ...item,
                totalPrice: item.totalPrice ?? (item.price || 0) * (item.quantity || 1),
            }));
        }

        return res.status(200).json({
            success: true,
            message: "Order fetched successfully.",
            order: plain,
        });

    } catch (error) {
        console.error("Get Order By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch order details.",
        });
    }
};

export const advanceOrderStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const order = await orderModel.findOne({ _id: id, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        if (Number(order.orderStatus) >= ORDER_STATUS.DELIVERED) {
            return res.status(400).json({ success: false, message: "Order already completed." });
        }
        const newStatus = Number(order.orderStatus) + 1;
        const update = { orderStatus: newStatus };
        if (newStatus === ORDER_STATUS.DELIVERED) {
            update.deliveredAt = new Date();
            if (order.paymentMethod !== "COD" && order.paymentIntentId) {
                try {
                    const captured = await stripe.paymentIntents.capture(order.paymentIntentId);
                    update.paymentStatus = "Paid";
                    update.transactionId = captured.charges?.data?.[0]?.balance_transaction || null;
                    update.paymentTimestamp = new Date();
                } catch (stripeErr) {
                    update.paymentStatus = "Failed";
                }
            }
        }
        const updated = await orderModel.findOneAndUpdate(
            { _id: id, userId, orderStatus: order.orderStatus },
            { $set: update },
            { new: true }
        );
        if (!updated) {
            return res.status(409).json({ success: false, message: "Order status changed by another request." });
        }
        const io = req.app.get("io");
        if (io) io.to(userId).emit("order:update", updated);

        const statusText = ORDER_STATUS_TEXT[newStatus];
        if (statusText) {
            const statusMessages = {
                [ORDER_STATUS.ACCEPTED]: { title: "Restaurant Accepted", message: `Your order #${updated.orderNumber} has been accepted by the restaurant.` },
                [ORDER_STATUS.PREPARING]: { title: "Preparing", message: `Your order #${updated.orderNumber} is being prepared.` },
                [ORDER_STATUS.READY_FOR_PICKUP]: { title: "Ready for Pickup", message: `Your order #${updated.orderNumber} is ready for pickup.` },
                [ORDER_STATUS.PICKED_UP]: { title: "Picked Up", message: `Your order #${updated.orderNumber} has been picked up.` },
                [ORDER_STATUS.OUT_FOR_DELIVERY]: { title: "Out for Delivery", message: `Your order #${updated.orderNumber} is out for delivery.` },
                [ORDER_STATUS.ARRIVING]: { title: "Arriving Soon", message: `Your order #${updated.orderNumber} is arriving soon.` },
                [ORDER_STATUS.DELIVERED]: { title: "Order Delivered", message: `Your order #${updated.orderNumber} has been delivered successfully.` },
            };
            const notif = statusMessages[newStatus];
            if (notif) {
                sendPushNotification({
                    userId,
                    type: "ORDER",
                    title: notif.title,
                    message: notif.message,
                    data: { orderId: String(updated._id), screen: "TrackOrder" },
                });
            }
        }

        return res.status(200).json({ success: true, order: updated });
    } catch (error) {
        console.error("Advance Order Status Error:", error);
        return res.status(500).json({ success: false, message: "Failed to advance order status." });
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { reason = "" } = req.body;

        const order = await orderModel.findOne({
            _id: id,
            userId,
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        if (order.orderStatus === ORDER_STATUS.CANCELLED) {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled.",
            });
        }

        if (NON_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: "Order cannot be cancelled at this stage.",
            });
        }

        order.orderStatus = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        order.cancellationReason = reason;

        if (
            order.paymentMethod !== "COD" &&
            order.paymentIntentId
        ) {
            try {
                await stripe.paymentIntents.cancel(order.paymentIntentId);
                order.paymentStatus = "Refunded";
            } catch (stripeErr) {
                if (order.paymentStatus === "Paid") {
                    order.paymentStatus = "Refunded";
                }
            }
        }

        await order.save();

        if (order.couponId) {
            decrementCouponUsage(order.couponId, userId);
        }

        try {
            const userCart = await cartModel.findOne({ userId });
            if (userCart && userCart.items.length > 0) {
                userCart.items = [];
                userCart.restaurantId = null;
                userCart.subtotal = 0;
                userCart.deliveryFee = 0;
                userCart.tax = 0;
                userCart.discount = 0;
                userCart.grandTotal = 0;
                userCart.markModified('items');
                userCart.markModified('restaurantId');
                await userCart.save();
            }
            } catch (cartErr) {
        }

        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('order:update', order);
        }

        sendPushNotification({
            userId,
            type: "ORDER",
            title: "Order Cancelled",
            message: `Your order #${order.orderNumber} has been cancelled.`,
            data: { orderId: String(order._id), screen: "Orders" },
        });

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully.",
            order,
        });

    } catch (error) {
        console.error("Cancel Order Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel order.",
        });
    }
};

export const rateOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { overallRating, foodRating, riderRating, riderFeedback, reviewText } = req.body;

        const order = await orderModel.findOne({ _id: id, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        if (order.isRated) {
            return res.status(400).json({ success: false, message: "Order already rated." });
        }

        order.isRated = true;
        order.overallRating = overallRating || 0;
        order.foodRating = foodRating || 0;
        order.riderRating = riderRating || 0;
        order.riderFeedback = riderFeedback || [];
        order.reviewText = reviewText || "";

        await order.save();

        return res.status(200).json({ success: true, message: "Rating submitted successfully." });
    } catch (error) {
        console.error("Rate Order Error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit rating." });
    }
};

export const reorder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const order = await orderModel.findOne({ _id: id, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const menuDoc = await restaurantMenuModel.findOne({ restaurantId: order.restaurantId });
        if (!menuDoc) {
            return res.status(404).json({ success: false, message: "Restaurant menu not found." });
        }

        let cart = await cartModel.findOne({ userId });
        if (!cart) {
            cart = await cartModel.create({ userId, restaurantId: order.restaurantId, items: [] });
        } else {
            cart.items = [];
            cart.restaurantId = order.restaurantId;
            cart.couponId = null;
            cart.couponCode = "";
            cart.couponTitle = "";
            cart.couponType = "";
            cart.discount = 0;
        }

        for (const item of order.items) {
            cart.items.push({
                menuItemId: item.menuItemId,
                name: item.name,
                image: item.image || "",
                price: item.price,
                quantity: item.quantity,
                isVeg: item.isVeg ?? true,
                customization: item.customizations || [],
            });
        }

        const round2 = (n) => Math.round(n * 100) / 100;
        let subtotal = 0;
        for (const item of cart.items) {
            const customizationPrice = (item.customization || []).reduce((s, o) => s + (o.price || 0), 0);
            item.totalPrice = round2((item.price + customizationPrice) * item.quantity);
            subtotal += item.totalPrice;
        }
        cart.subtotal = round2(subtotal);
        cart.deliveryFee = subtotal >= 500 ? 0 : 40;
        cart.tax = round2(subtotal * 0.05);
        cart.grandTotal = round2(cart.subtotal + cart.deliveryFee + cart.tax);

        cart.markModified("items");
        await cart.save();

        return res.status(200).json({ success: true, message: "Items added to cart.", cart });
    } catch (error) {
        console.error("Reorder Error:", error);
        return res.status(500).json({ success: false, message: "Failed to reorder." });
    }
};
