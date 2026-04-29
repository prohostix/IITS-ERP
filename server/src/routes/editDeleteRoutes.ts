import express from 'express';
import {
  submitEditDeleteRequest,
  getEditDeleteRequests,
  getEditDeleteRequest,
  respondToEditDeleteRequest,
  getEditDeleteStats,
} from '../controllers/editDeleteController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Ops can submit requests, Finance can view all
router
  .route('/request')
  .post(authorize('ops_admin'), submitEditDeleteRequest);

router
  .route('/requests')
  .get(authorize('ops_admin', 'finance_admin'), getEditDeleteRequests);

router
  .route('/requests/:id')
  .get(authorize('ops_admin', 'finance_admin'), getEditDeleteRequest)
  .patch(authorize('finance_admin'), respondToEditDeleteRequest);

router
  .route('/stats')
  .get(authorize('finance_admin'), getEditDeleteStats);

export default router;
