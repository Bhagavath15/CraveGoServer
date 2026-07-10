import restaurantModel from "../models/restaurantDetails.js"
import restaurantMenuModel from "../models/restaurantMenu.js";

export const getRestaurants = async (req, res) => {
    try {
        const restaurants = await restaurantModel.find();
        res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            restaurants,
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error
        })

    }
}
export const getRestaurantMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        console.log("Param:", restaurantId);

        const restaurantMenu = await restaurantMenuModel.findOne({
            restaurantId,
        });
        console.log(`restaurantController.js 30 restaurantMenu---->`,restaurantMenu)

        if (!restaurantMenu) {
            return res.status(404).send({
                success: false,
                message: "Restaurant menu not found",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Restaurant menu fetched successfully",
            data: restaurantMenu,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};