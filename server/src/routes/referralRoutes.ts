import express from 'express';
import {
  generateReferralLink,
  getMyReferralLinks,
  getAllReferralLinks,
  updateReferralLinkStatus,
  getReferredCenters,
  getReferredStudents,
  getReferralMetrics,
  validateReferralSlug,
  getReferralLeaderboard,
} from '../controllers/referralController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for validating referral links
router.get('/validate/:slug', validateReferralSlug);

// All other routes require authentication
router.use(protect);

const ALL_ROLES = ['superadmin', 'org_admin', 'ceo', 'hr_admin', 'finance_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'bde', 'employee'];

// Generate and manage own referral links
router
  .route('/generate')
  .post(authorize(...ALL_ROLES), generateReferralLink);

router
  .route('/my-links')
  .get(authorize(...ALL_ROLES), getMyReferralLinks);

// Admin routes for managing all referral links
router
  .route('/links')
  .get(authorize('sales_admin', 'org_admin', 'ceo', 'superadmin'), getAllReferralLinks);

router
  .route('/links/:id')
  .patch(authorize('sales_admin', 'org_admin', 'superadmin'), updateReferralLinkStatus);

// Referral tracking
router
  .route('/centers')
  .get(authorize(...ALL_ROLES), getReferredCenters);

router
  .route('/students')
  .get(authorize(...ALL_ROLES), getReferredStudents);

router
  .route('/metrics')
  .get(authorize(...ALL_ROLES), getReferralMetrics);

router
  .route('/leaderboard')
  .get(authorize('sales_admin', 'org_admin', 'ceo', 'superadmin'), getReferralLeaderboard);

export default router;
