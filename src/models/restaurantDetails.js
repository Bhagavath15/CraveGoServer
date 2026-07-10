import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        category: [
            {
                type: String,
            },
        ],

        cuisines: [
            {
                type: String,
            },
        ],

        address: {
            type: String,
            required: true,
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalRatings: {
            type: String,
            default: "0",
        },

        distance: {
            type: String,
        },

        deliveryTime: {
            type: String,
        },

        priceForOne: {
            type: String,
        },

        offer: {
            type: String,
        },

        offerDescription: {
            type: String,
        },

        isVeg: {
            type: Boolean,
            default: false,
        },

        isFavorite: {
            type: Boolean,
            default: false,
        },

        restaurantId: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

const restaurantModel = mongoose.model("Restaurant", restaurantSchema);

export default restaurantModel;