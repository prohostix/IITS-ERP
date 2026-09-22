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
// Commission In (Earnings) - Finance only
router.get('/in', authorize('finance_admin', 'superadmin', 'org_admin'), getCommissionInList);
router.post('/in/:id/receive', authorize('finance_admin', 'superadmin', 'org_admin'), markCommissionInReceived);

// Commission Out (Payouts to Centers) - Finance AND Center Admin (for view)
router.get('/out', authorize('finance_admin', 'superadmin', 'org_admin', 'center_admin'), getCommissionOutList);
router.post('/out/:id/pay', authorize('finance_admin', 'superadmin', 'org_admin'), payCommissionOut);

export default router;
