// @ts-nocheck
import express from 'express';
import {
  getWallet,
  submitTopUp,
  getTopUpHistory,
  getWalletTransactions,
  getEnrollablePrograms,
  createEnrollment,
  updateEnrollment,
  getMyEnrollments,
  getMyCenterStatus,
  submitMyCenterPayment,
  getAllEnrollments,
  getActiveSessions,
  checkEmailUniqueness,
  processPaymentStage,
} from '../controllers/enrollmentController.js';
import {
  getPendingReviews,
  getDeptReviewEnrollments,
  approveDeptEnrollment,
  rejectDeptEnrollment,
  updateDocumentStatus,
} from '../controllers/enrollmentReviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Study Center wallet routes
router.get('/wallet', authorize('center_admin'), getWallet);
router.post('/wallet/topup', authorize('center_admin'), upload.single('proofDocument'), submitTopUp);
router.get('/wallet/topups', authorize('center_admin'), getTopUpHistory);
router.get('/wallet/transactions', authorize('center_admin'), getWalletTransactions);

// Study Center enrollment routes
router.get('/programs', authorize('center_admin'), getEnrollablePrograms);
router.get('/sessions', authorize('center_admin'), getActiveSessions);
router.post('/check-email', authorize('center_admin'), checkEmailUniqueness);
router.post('/enroll', authorize('center_admin'), createEnrollment);
router.put('/enroll/:id', authorize('center_admin'), updateEnrollment);
router.post('/enroll/:id/pay', authorize('center_admin'), processPaymentStage);
router.get('/enrollments', authorize('center_admin'), getMyEnrollments);

// Center onboarding status & payment (authenticated)
router.get('/my-center-status', authorize('center_admin'), getMyCenterStatus);
router.post('/submit-payment', authorize('center_admin'), upload.single('proofFile'), submitMyCenterPayment);

// Dedicated file upload for enrollment documents
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.originalname });
});

// Global enrollment list (for admins/staff)
router.get('/all', authorize('superadmin', 'org_admin', 'ceo', 'general_manager', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'branch_manager', 'bde', 'employee', 'staff'), getAllEnrollments);

// Dept/Sub-dept manager review routes
router.get('/review', authorize('ops_admin', 'ops_sub_admin', 'employee', 'superadmin', 'org_admin'), getPendingReviews);
router.put('/review/:id/approve', authorize('ops_admin', 'ops_sub_admin', 'employee', 'superadmin', 'org_admin'), approveDeptEnrollment);
router.put('/review/:id/reject', authorize('ops_admin', 'ops_sub_admin', 'employee', 'superadmin', 'org_admin'), rejectDeptEnrollment);
router.put('/review/:id/document', authorize('ops_admin', 'ops_sub_admin', 'employee', 'superadmin', 'org_admin'), updateDocumentStatus);

export default router;
