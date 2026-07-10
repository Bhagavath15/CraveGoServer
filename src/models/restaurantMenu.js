import mongoose from "mongoose";

const customizationOptionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const customizationGroupSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    maxSelect: {
      type: Number,
      default: 1, // 1 = single selection, 0 = unlimited, >1 = limited multi-select
    },

    options: [customizationOptionSchema],
  },
  {
    _id: false,
  }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    isVeg: {
      type: Boolean,
      default: false,
    },

    isBestseller: {
      type: Boolean,
      default: false,
    },

    customizable: {
      type: Boolean,
      default: false,
    },

    customizations: {
      type: [customizationGroupSchema],
      default: [],
    },
  },
  {
    _id: true,
  }
);

const menuCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    items: [menuItemSchema],
  },
  {
    _id: false,
  }
);

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
      index: true,
    },

    menu: [menuCategorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RestaurantMenu", menuSchema);