import { Router } from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import { validate, schemas } from "../middleware/validate.js";
import {
    registerToken,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
} from "../controller/notificationController.js";

const router = Router();

router.post("/register-token", requireSignIn, validate(schemas.registerToken), registerToken);
router.get("/", requireSignIn, getNotifications);
router.get("/unread-count", requireSignIn, getUnreadCount);
router.patch("/:id/read", requireSignIn, markAsRead);
router.patch("/read-all", requireSignIn, markAllAsRead);
router.delete("/:id", requireSignIn, deleteNotification);

export default router;
