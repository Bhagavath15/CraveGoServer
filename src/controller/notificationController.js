import userModel from "../models/user.js";
import notificationModel from "../models/notificationModel.js";

export const registerToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fcmToken } = req.body;

        if (!fcmToken || typeof fcmToken !== "string") {
            return res.status(400).json({ success: false, message: "fcmToken is required." });
        }

        const user = await userModel.findById(userId).select("fcmToken fcmTokenUpdatedAt");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.fcmToken === fcmToken) {
            return res.status(200).json({ success: true, message: "Token already registered." });
        }

        user.fcmToken = fcmToken;
        user.fcmTokenUpdatedAt = new Date();
        await user.save();

        return res.status(200).json({ success: true, message: "Token registered successfully." });
    } catch (error) {
        console.error("registerToken error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to register token." });
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            notificationModel
                .find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            notificationModel.countDocuments({ userId }),
        ]);

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("getNotifications error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch notifications." });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationModel.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        const unreadCount = await notificationModel.countDocuments({ userId, isRead: false });

        return res.status(200).json({ success: true, data: notification, unreadCount });
    } catch (error) {
        console.error("markAsRead error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark as read." });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await notificationModel.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        return res.status(200).json({ success: true, message: "All notifications marked as read." });
    } catch (error) {
        console.error("markAllAsRead error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to mark all as read." });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationModel.findOneAndDelete({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        const unreadCount = await notificationModel.countDocuments({ userId, isRead: false });

        return res.status(200).json({ success: true, message: "Notification deleted.", unreadCount });
    } catch (error) {
        console.error("deleteNotification error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to delete notification." });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await notificationModel.countDocuments({ userId, isRead: false });
        return res.status(200).json({ success: true, count });
    } catch (error) {
        console.error("getUnreadCount error:", error.message);
        return res.status(500).json({ success: false, count: 0 });
    }
};
