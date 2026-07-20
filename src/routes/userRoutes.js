import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile } from '../controller/userController.js';

const router = express.Router();

router.get('/profile', requireSignIn, getProfile);
router.patch('/profile', requireSignIn, updateProfile);

export default router;
