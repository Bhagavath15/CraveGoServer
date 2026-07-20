import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      default: "",
    },

    badgeText: {
      type: String,
      default: "",
    },

    titleLine1: {
      type: String,
      default: "",
    },

    titleLine2: {
      type: String,
      default: "",
    },

    titleLine3: {
      type: String,
      default: "",
    },

    buttonText: {
      type: String,
      default: "",
    },

    couponCode: {
      type: String,
      default: "",
      uppercase: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Banner", bannerSchema);
