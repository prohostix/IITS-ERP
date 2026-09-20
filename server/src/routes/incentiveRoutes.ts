// @ts-nocheck
import express from 'express';
import {
  createIncentiveStructure,
  getIncentiveStructures,
  getIncentiveStructure,
  updateIncentiveStructure,
  approveIncentiveStructure,
  deleteIncentiveStructure,
  calculateIncentive,
  getCurrentActiveIncentives,
} from '../controllers/incentiveController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Incentive structure management
router
  .route('/')
  .post(authorize('finance_admin', 'superadmin', 'org_admin'), createIncentiveStructure)
  .get(authorize('finance_admin', 'hr_admin', 'superadmin', 'org_admin'), getIncentiveStructures);

router
  .route('/:id')
  .get(protect, getIncentiveStructure)
  .patch(authorize('finance_admin', 'superadmin', 'org_admin'), updateIncentiveStructure)
  .delete(authorize('finance_admin', 'superadmin', 'org_admin'), deleteIncentiveStructure);

router
  .route('/:id/approve')
  .patch(authorize('finance_admin', 'superadmin', 'org_admin'), approveIncentiveStructure);

// Incentive calculation
router
  .route('/calculate')
  .post(protect, calculateIncentive);

router
  .route('/active/current')
  .get(protect, getCurrentActiveIncentives);

export default router;
