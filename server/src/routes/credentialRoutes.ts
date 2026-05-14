import express from 'express';
import {
  submitCredentialRequest,
  getCredentialRequests,
  getCredentialRequest,
  respondToCredentialRequest,
  getCredentialStats,
} from '../controllers/credentialController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Ops can submit requests, Finance can view all
router
  .route('/request')
  .post(authorize('ops_admin'), submitCredentialRequest);

router
  .route('/requests')
  .get(authorize('ops_admin', 'finance_admin'), getCredentialRequests);

router
  .route('/requests/:id')
  .get(authorize('ops_admin', 'finance_admin'), getCredentialRequest)
  .patch(authorize('finance_admin'), respondToCredentialRequest);

router
  .route('/stats')
  .get(authorize('finance_admin'), getCredentialStats);

export default router;
