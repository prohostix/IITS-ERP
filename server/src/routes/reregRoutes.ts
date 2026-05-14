import express from 'express';
import {
  createOrUpdateReregRules,
  getReregRules,
  getPendingReregs,
  getCompletedReregs,
  processRereg,
  carryForwardMissedReregs,
  getReregStats,
} from '../controllers/reregController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// REREG rules management
router
  .route('/rules')
  .post(authorize('finance_admin'), createOrUpdateReregRules)
  .get(authorize('finance_admin', 'ops_admin'), getReregRules);

// REREG processing
router
  .route('/pending')
  .get(authorize('finance_admin', 'ops_admin'), getPendingReregs);

router
  .route('/completed')
  .get(authorize('finance_admin', 'ops_admin'), getCompletedReregs);

router
  .route('/process/:studentId')
  .post(authorize('ops_admin'), processRereg);

// Cron job endpoint (should be protected with API key in production)
router
  .route('/carryforward')
  .post(carryForwardMissedReregs);

router
  .route('/stats')
  .get(authorize('finance_admin'), getReregStats);

export default router;
