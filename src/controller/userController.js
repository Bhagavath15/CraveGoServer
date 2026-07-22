import userModel from "../models/user.js";

export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
                notifPref: user.notifPref
            }
        });
    } catch (err) {
        console.error("User Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, notifPref } = req.body;

        const update = {};
        if (name !== undefined) update.name = name;
        if (phone !== undefined) update.phone = phone;
        if (notifPref !== undefined) update.notifPref = notifPref;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { $set: update },
            { returnDocument: "after" }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
                notifPref: user.notifPref
            }
        });
    } catch (err) {
        console.error("User Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};
