// @ts-nocheck
import express from 'express';
import {
  getCommissionInList,
  markCommissionInReceived,
  getCommissionOutList,
  payCommissionOut
} from '../controllers/commissionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('finance_admin'));

// Commission In (Earnings)
router.get('/in', getCommissionInList);
router.post('/in/:id/receive', markCommissionInReceived);

// Commission Out (Payouts to Centers)
router.get('/out', getCommissionOutList);
router.post('/out/:id/pay', payCommissionOut);

export default router;
