import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { addAddress, deleteAddress, editAddress, getAddress, getAddressById, setDefaultAddress } from '../controller/addressController.js';

const router = express.Router();

router.post('/', requireSignIn, addAddress)
router.get('/', requireSignIn, getAddress)
router.get('/:id', requireSignIn, getAddressById)
router.put('/:id', requireSignIn, editAddress)
router.delete('/:id', requireSignIn, deleteAddress)
router.patch('/:id/default', requireSignIn, setDefaultAddress)

export default router;
