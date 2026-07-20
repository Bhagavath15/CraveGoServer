import { getMessaging } from "firebase-admin/messaging";
import firebaseApp from "../config/firebase.js";
import userModel from "../models/user.js";
import notificationModel from "../models/notificationModel.js";

export const sendPushNotification = async ({ userId, type, title, message, data = {} }) => {
    try {
        const notificationDoc = await notificationModel.create({
            userId,
            type,
            title,
            message,
            data,
        });

        const user = await userModel.findById(userId).select("fcmToken");

        if (!user?.fcmToken) {
            return notificationDoc;
        }

        if (!firebaseApp) {
            return notificationDoc;
        }

        const payload = {
            token: user.fcmToken,
            notification: {
                title,
                body: message,
            },
            data: {
                type,
                ...Object.fromEntries(
                    Object.entries(data).map(([k, v]) => [k, String(v ?? "")])
                ),
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "cravego_otp",
                    priority: "high",
                    sound: "default",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        alert: { title, body: message },
                    },
                },
            },
        };

        const messaging = getMessaging(firebaseApp);
        const fcmResult = await messaging.send(payload);

        return notificationDoc;
    } catch (error) {
        if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
            try {
                await userModel.findByIdAndUpdate(userId, {
                    $set: { fcmToken: null, fcmTokenUpdatedAt: null },
                });
            } catch { }
        }
        return null;
    }
};

export const getUnreadCount = async (userId) => {
    try {
        return await notificationModel.countDocuments({ userId, isRead: false });
    } catch {
        return 0;
    }
};
