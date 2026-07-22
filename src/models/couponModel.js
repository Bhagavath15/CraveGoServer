import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    title: String,

    description: String,

    discountType: {
      type: String,
      enum: ["FLAT", "PERCENTAGE", "FREE_DELIVERY"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
    },

    maximumDiscount: {
      type: Number,
      default: 0,
    },

    restaurantId: {
      type: String,
      default: null,
    },

    validFrom: Date,

    validTill: Date,

    usageLimit: {
      type: Number,
      default: 0,
    },

    firstOrderOnly: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    usedBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Coupon", couponSchema);
