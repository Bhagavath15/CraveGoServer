import express from 'express';
import { requireSignIn } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';
import { addAddress, getAddress, getAddressById, editAddress, deleteAddress, setDefaultAddress } from '../controller/addressController.js';

const router = express.Router();

router.post('/', requireSignIn, validate(schemas.address), addAddress);
router.get('/', requireSignIn, getAddress);
router.get('/:id', requireSignIn, getAddressById);
router.put('/:id', requireSignIn, validate(schemas.address), editAddress);
router.delete('/:id', requireSignIn, deleteAddress);
router.patch('/:id/default', requireSignIn, setDefaultAddress);

export default router;
