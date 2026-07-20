import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        restaurantId: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

favouriteSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

const favouriteModel = mongoose.model("Favourite", favouriteSchema);

export default favouriteModel;
