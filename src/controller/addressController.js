import addressDetails from "../models/addressDetails.js";

export const addAddress = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            fullName, mobileNumber, houseNumber, apartment, landmark,
            area, city, state, pincode, latitude, longitude, addressType,
        } = req.body;

        if (!fullName || !mobileNumber || !houseNumber || !area || !city || !state || !pincode) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields.",
            });
        }

        const existingCount = await addressDetails.countDocuments({ userId });

        const address = await addressDetails.create({
            userId, fullName, mobileNumber, houseNumber, apartment, landmark,
            area, city, state, pincode, latitude, longitude, addressType,
            isDefault: existingCount === 0,
        });

        return res.status(201).json({
            success: true,
            message: "Address added successfully.",
            address,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getAddress = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await addressDetails.find({ userId }).sort({
            isDefault: -1,
            createdAt: -1,
        });

        return res.status(200).json({
            success: true,
            total: addresses.length,
            addresses,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getAddressById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const address = await addressDetails.findOne({ _id: id, userId });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found.",
            });
        }

        return res.status(200).json({
            success: true,
            address,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const editAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const address = await addressDetails.findOne({ _id: id, userId });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found.",
            });
        }

        const fields = [
            "fullName", "mobileNumber", "houseNumber", "apartment", "landmark",
            "area", "city", "state", "pincode", "latitude", "longitude", "addressType",
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                address[field] = req.body[field];
            }
        });

        await address.save();

        return res.status(200).json({
            success: true,
            message: "Address updated successfully.",
            address,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const address = await addressDetails.findOne({ _id: id, userId });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found.",
            });
        }

        const wasDefault = address.isDefault;

        await addressDetails.findByIdAndDelete(id);

        if (wasDefault) {
            const nextDefault = await addressDetails.findOne({ userId }).sort({ createdAt: 1 });

            if (nextDefault) {
                nextDefault.isDefault = true;
                await nextDefault.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Address deleted successfully.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const address = await addressDetails.findOne({
            _id: id,
            userId,
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found.",
            });
        }

        // Remove existing default
        await addressDetails.updateMany(
            { userId },
            {
                $set: {
                    isDefault: false,
                },
            }
        );

        // Set selected address as default
        address.isDefault = true;
        await address.save();

        return res.status(200).json({
            success: true,
            message: "Default address updated successfully.",
            address,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};