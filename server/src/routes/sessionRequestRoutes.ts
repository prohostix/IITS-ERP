import express from 'express';
import {
  createSessionRequest,
  getSessionRequests,
  getSessionRequest,
  approveSessionRequest,
  rejectSessionRequest,
  getSessionRequestStats,
} from '../controllers/sessionRequestController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Session request management
router
  .route('/request')
  .post(protect, createSessionRequest); // Any authenticated user can request

router
  .route('/requests')
  .get(protect, getSessionRequests);

router
  .route('/requests/:id')
  .get(protect, getSessionRequest);

router
  .route('/requests/:id/approve')
  .patch(authorize('ops_admin'), approveSessionRequest);

router
  .route('/requests/:id/reject')
  .patch(authorize('ops_admin'), rejectSessionRequest);

router
  .route('/stats')
  .get(authorize('ops_admin'), getSessionRequestStats);

export default router;
