import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';
import { getProfile, updateProfile } from '../controller/userController.js';

const router = express.Router();

router.get('/profile', requireSignIn, getProfile);
router.patch('/profile', requireSignIn, validate(schemas.updateProfile), updateProfile);

export default router;
