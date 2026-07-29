import express from 'express';
import { getRestaurantMenu, getRestaurants, getSuggestions } from '../controller/restaurantController.js';
import { requireSignIn } from '../middleware/authMiddleware.js';

const router = express.Router()

router.get('/', getRestaurants);
router.get("/suggestions", getSuggestions);
router.get("/:restaurantId/menu", requireSignIn, getRestaurantMenu);

export default router;