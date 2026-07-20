import bannerModel from "../models/bannerModel.js";

export const getActiveBanners = async (req, res) => {
    try {
        const banners = await bannerModel
            .find({ isActive: true })
            .sort({ sortOrder: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Banners fetched successfully",
            data: banners,
        });
    } catch (error) {
        console.error("Get Banners Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch banners",
        });
    }
};
