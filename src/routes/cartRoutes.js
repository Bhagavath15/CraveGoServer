import express from "express";

import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from "../controller/cartController.js";
import { requireSignIn } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', requireSignIn, addToCart)
router.get('/', requireSignIn, getCart)
router.patch('/update', requireSignIn, updateCartItem)
router.delete('/delete', requireSignIn, removeCartItem)
router.delete('/clear', requireSignIn, clearCart)

export default router;