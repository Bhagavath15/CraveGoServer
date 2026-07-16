import mongoose from "mongoose";
import { ORDER_STATUS_TEXT, ORDER_STATUS } from "../constants/orderStatus.js";

const orderItemSchema = new mongoose.Schema(
    {
        menuItemId: {
            type: String,
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            default: "",
        },

        price: {
            type: Number,
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
        },

        customizations: [
            {
                id: String,
                name: String,
                price: Number,
            },
        ],

        totalPrice: {
            type: Number,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const addressSnapshotSchema = new mongoose.Schema(
    {
        fullName: String,
        mobileNumber: String,
        houseNumber: String,
        apartment: String,
        landmark: String,
        area: String,
        city: String,
        state: String,
        pincode: String,
        addressType: String,
    },
    { _id: false }
);

const restaurantSnapshotSchema = new mongoose.Schema(
    {
        name: String,
        image: String,
        rating: Number,
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        restaurantId: {
            type: String,
            required: true,
            index: true,
        },

        restaurantSnapshot: {
            type: restaurantSnapshotSchema,
            default: null,
        },

        addressId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Address",
            required: true,
        },

        addressSnapshot: {
            type: addressSnapshotSchema,
            default: null,
        },

        items: {
            type: [orderItemSchema],
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
        },

        deliveryFee: {
            type: Number,
            default: 0,
        },

        taxes: {
            type: Number,
            default: 0,
        },

        discount: {
            type: Number,
            default: 0,
        },

        grandTotal: {
            type: Number,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ["COD", "UPI", "CARD"],
            default: "COD",
        },

        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded"],
            default: "Pending",
        },

        orderStatus: {
            type: Number,
            default: ORDER_STATUS.PLACED,
        },

        estimatedDeliveryTime: {
            type: Number,
            default: 30,
        },

        deliveredAt: {
            type: Date,
            default: null,
        },

        cancelledAt: {
            type: Date,
            default: null,
        },

        cancellationReason: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);