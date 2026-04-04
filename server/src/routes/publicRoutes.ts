import express from 'express';
import { validateInviteToken, publicRegister, getPaymentStatus, submitPaymentProof } from '../controllers/publicController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// No auth required on these routes
router.get('/invite/:token', validateInviteToken);
router.post('/register', upload.array('documents', 10), publicRegister);
router.get('/payment-status/:token', getPaymentStatus);
router.post('/submit-payment/:token', upload.array('paymentProof', 1), submitPaymentProof);

export default router;
