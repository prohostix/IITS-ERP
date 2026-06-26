// @ts-nocheck
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendBroadcastNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.post('/broadcast', authorize('ops_admin', 'ops_sub_admin', 'employee', 'finance_admin', 'finance', 'org_admin', 'superadmin'), sendBroadcastNotification);
router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
