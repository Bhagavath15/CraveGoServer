import express from "express";
import {
    addFavourite,
    getFavourites,
    removeFavourite,
    checkFavouriteStatus,
} from "../controller/favouriteController.js";
import { requireSignIn } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireSignIn, addFavourite);
router.get("/", requireSignIn, getFavourites);
router.delete("/:restaurantId", requireSignIn, removeFavourite);
router.get("/:restaurantId/status", requireSignIn, checkFavouriteStatus);

export default router;
