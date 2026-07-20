import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
    {
        menuItemId: {
            type: String,
            required: true,
        },

        name: {
            type: String,
            required: true,
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
            default: 1,
            min: 1,
        },

        isVeg: {
            type: Boolean,
            default: true,
        },

        customization: [
            {
                name: String,
                price: Number,
            },
        ],

        totalPrice: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        restaurantId: {
            type: String,
            ref: "Restaurant",
            default: null,
        },

        items: [cartItemSchema],

        subtotal: {
            type: Number,
            default: 0,
        },

        deliveryFee: {
            type: Number,
            default: 0,
        },

        tax: {
            type: Number,
            default: 0,
        },

        discount: {
            type: Number,
            default: 0,
        },

        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null,
        },

        couponCode: {
            type: String,
            default: "",
            uppercase: true,
            trim: true,
        },

        couponTitle: {
            type: String,
            default: "",
        },

        couponType: {
            type: String,
            enum: ["FLAT", "PERCENTAGE", "FREE_DELIVERY", ""],
            default: "",
        },

        grandTotal: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const cartModel = mongoose.model("Cart", cartSchema);
export default cartModel;
