import express from 'express';
import {
  getWallet,
  submitTopUp,
  getTopUpHistory,
  getEnrollablePrograms,
  createEnrollment,
  getMyEnrollments,
  getMyCenterStatus,
  submitMyCenterPayment,
} from '../controllers/enrollmentController.js';
import {
  getDeptReviewEnrollments,
  approveDeptEnrollment,
  rejectDeptEnrollment,
} from '../controllers/enrollmentReviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Study Center wallet routes
router.get('/wallet', authorize('center_admin'), getWallet);
router.post('/wallet/topup', authorize('center_admin'), upload.single('proofDocument'), submitTopUp);
router.get('/wallet/topups', authorize('center_admin'), getTopUpHistory);

// Study Center enrollment routes
router.get('/programs', authorize('center_admin'), getEnrollablePrograms);
router.post('/enroll', authorize('center_admin'), createEnrollment);
router.get('/enrollments', authorize('center_admin'), getMyEnrollments);

// Center onboarding status & payment (authenticated)
router.get('/my-center-status', authorize('center_admin'), getMyCenterStatus);
router.post('/submit-payment', authorize('center_admin'), upload.single('proofFile'), submitMyCenterPayment);

// Dept/Sub-dept manager review routes
router.get('/review', authorize('ops_admin', 'ops_sub_admin', 'employee'), getDeptReviewEnrollments);
router.put('/review/:id/approve', authorize('ops_admin', 'ops_sub_admin', 'employee'), approveDeptEnrollment);
router.put('/review/:id/reject', authorize('ops_admin', 'ops_sub_admin', 'employee'), rejectDeptEnrollment);

export default router;
