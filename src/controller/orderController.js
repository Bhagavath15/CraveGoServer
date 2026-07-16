import mongoose from "mongoose";
import addressDetails from "../models/addressDetails.js";
import cartModel from "../models/cart.js";
import orderModel from "../models/orderModel.js";
import restaurantModel from "../models/restaurantDetails.js";
import restaurantMenuModel from "../models/restaurantMenu.js";
import { generateOrderNumber } from "../utils/orderCounter.js";
import { ORDER_STATUS, ORDER_STATUS_TEXT, ACTIVE_STATUSES, NON_CANCELLABLE_STATUSES } from "../constants/orderStatus.js";

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

        const { addressId, paymentMethod, idempotencyKey } = req.body;

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

        const allowedMethods = ["COD", "UPI", "CARD"];

        if (!allowedMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method.",
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
            const customizationTotal = (item.customizations || []).reduce(
                (sum, option) => sum + option.price,
                0
            );

            const unitPrice = item.price + customizationTotal;

            const totalPrice = unitPrice * item.quantity;

            subtotal += totalPrice;

            return {
                menuItemId: item.menuItemId,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                customizations: item.customizations,
                totalPrice,
            };
        });

        const deliveryFee =
            subtotal >= DELIVERY_CONFIG.FREE_DELIVERY_MIN_AMOUNT
                ? 0
                : DELIVERY_CONFIG.DELIVERY_FEE;

        const taxes = Math.round(
            subtotal * (DELIVERY_CONFIG.GST_PERCENTAGE / 100)
        );

        const discount = 0;

        const grandTotal =
            subtotal +
            deliveryFee +
            taxes -
            discount;

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
                    taxes,
                    discount,
                    grandTotal,
                    paymentMethod,
                    paymentStatus: "Pending",
                    orderStatus: ORDER_STATUS.PLACED,
                },
            ],
            { session }
        );

        await session.commitTransaction();

        cart.items = [];
        cart.restaurantId = null;
        cart.subtotal = 0;
        cart.deliveryFee = 0;
        cart.taxes = 0;
        cart.discount = 0;
        cart.grandTotal = 0;

        await cart.save();

        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('order:update', order);
        }

        return res.status(201).json({
            success: true,
            message: "Order placed successfully.",
            order,
        });
    } catch (error) {
        await session.abortTransaction();

        return res.status(500).json({
            success: false,
            message: error.message,
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
        return res.status(500).json({
            success: false,
            message: error.message,
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

        return res.status(200).json({
            success: true,
            message: "Order fetched successfully.",
            order,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
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
        if (newStatus === ORDER_STATUS.DELIVERED) update.deliveredAt = new Date();
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
        return res.status(200).json({ success: true, order: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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

        /*
        |--------------------------------------------------------------------------
        | Refund Logic (Future)
        |--------------------------------------------------------------------------
        */

        if (
            order.paymentMethod !== "COD" &&
            order.paymentStatus === "Paid"
        ) {
            // Trigger refund service later
        }

        await order.save();

        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('order:update', order);
        }

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully.",
            data: order,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};
