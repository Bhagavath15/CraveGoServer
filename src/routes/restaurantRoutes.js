import express from 'express';
import { getRestaurantMenu, getRestaurants } from '../controller/restaurantController.js';
import { requireSignIn } from '../middleware/authMiddleware.js';

const router = express.Router()

router.get('/', requireSignIn, getRestaurants)
router.get("/:restaurantId/menu", requireSignIn, getRestaurantMenu);

export default router;