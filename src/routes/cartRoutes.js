import express from "express";

import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from "../controller/cartController.js";
import { requireSignIn } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.post('/add', requireSignIn, validate(schemas.addToCart), addToCart)
router.get('/', requireSignIn, getCart)
router.patch('/update', requireSignIn, validate(schemas.updateCartItem), updateCartItem)
router.post('/delete', requireSignIn, validate(schemas.removeCartItem), removeCartItem)
router.post('/clear', requireSignIn, clearCart)

export default router;