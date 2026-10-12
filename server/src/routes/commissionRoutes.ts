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
router.get('/in', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), getCommissionInList);
router.post('/in/:id/receive', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), markCommissionInReceived);

// Commission Out (Payouts to Centers) - Finance AND Center Admin (for view)
router.get('/out', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'center_admin', 'ceo'), getCommissionOutList);
router.post('/out/:id/pay', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), payCommissionOut);

export default router;
