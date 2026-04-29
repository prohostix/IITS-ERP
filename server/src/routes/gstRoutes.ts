import express from 'express';
import {
  createGSTSetting,
  getGSTSettings,
  getGSTSetting,
  updateGSTSetting,
  deleteGSTSetting,
  getApplicableGST,
  calculateGST,
  getGSTSummary,
} from '../controllers/gstController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GST settings management
router
  .route('/settings')
  .post(authorize('finance_admin'), createGSTSetting)
  .get(authorize('finance_admin', 'ops_admin'), getGSTSettings);

router
  .route('/settings/:id')
  .get(authorize('finance_admin', 'ops_admin'), getGSTSetting)
  .patch(authorize('finance_admin'), updateGSTSetting)
  .delete(authorize('finance_admin'), deleteGSTSetting);

// GST calculation and lookup
router
  .route('/applicable/:feeType')
  .get(protect, getApplicableGST);

router
  .route('/calculate')
  .post(protect, calculateGST);

router
  .route('/summary')
  .get(authorize('finance_admin'), getGSTSummary);

export default router;
