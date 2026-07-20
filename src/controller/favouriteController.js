import favouriteModel from "../models/favourite.js";
import restaurantModel from "../models/restaurantDetails.js";

export const addFavourite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurantId } = req.body;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID is required",
            });
        }

        const restaurant = await restaurantModel.findOne({ restaurantId });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        const existing = await favouriteModel.findOne({ userId, restaurantId });

        if (existing) {
            return res.status(200).json({
                success: true,
                message: "Restaurant is already in favourites",
                isFavourite: true,
            });
        }

        const favourite = await favouriteModel.create({ userId, restaurantId });

        return res.status(201).json({
            success: true,
            message: "Added to favourites",
            isFavourite: true,
            favourite,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getFavourites = async (req, res) => {
    try {
        const userId = req.user.id;

        const favourites = await favouriteModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        const restaurantIds = favourites.map((f) => f.restaurantId);

        const restaurants = await restaurantModel
            .find({ restaurantId: { $in: restaurantIds } })
            .lean();

        const restaurantMap = {};
        for (const r of restaurants) {
            restaurantMap[r.restaurantId] = r;
        }

        const enriched = favourites
            .map((fav) => {
                const rest = restaurantMap[fav.restaurantId];
                if (!rest) return null;
                return { ...rest, isFavourite: true };
            })
            .filter(Boolean);

        return res.status(200).json({
            success: true,
            favourites: enriched,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const removeFavourite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurantId } = req.params;

        const result = await favouriteModel.findOneAndDelete({ userId, restaurantId });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Favourite not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Removed from favourites",
            isFavourite: false,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const checkFavouriteStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurantId } = req.params;

        const existing = await favouriteModel.findOne({ userId, restaurantId });

        return res.status(200).json({
            success: true,
            isFavourite: !!existing,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};
