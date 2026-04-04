import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getMonthlyLateSummary,
  getAttendances,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getHRSettings,
  createOrUpdateHRSettings,
  biometricSync,
} from '../controllers/attendanceController.js';

const router = express.Router();

// Static routes MUST come before /:id to avoid Express matching them as IDs

// HR Settings routes
router.get('/settings', protect, authorize('hr_admin', 'superadmin'), getHRSettings);
router.post('/settings', protect, authorize('hr_admin', 'superadmin'), createOrUpdateHRSettings);
router.put('/settings', protect, authorize('hr_admin', 'superadmin'), createOrUpdateHRSettings);

// Biometric sync endpoint (called by biometric device/middleware)
router.post('/biometric-sync', protect, authorize('hr_admin', 'superadmin'), biometricSync);

// Employee routes - punch in/out
router.post('/punch-in', protect, punchIn);
router.post('/punch-out', protect, punchOut);
router.get('/today', protect, getTodayAttendance);
router.get('/late-summary', protect, getMonthlyLateSummary);

// HR routes - view all attendances
router.get('/', protect, authorize('hr_admin', 'superadmin'), getAttendances);
router.post('/', protect, authorize('hr_admin', 'superadmin'), createAttendance);
router.put('/:id', protect, authorize('hr_admin', 'superadmin'), updateAttendance);
router.delete('/:id', protect, authorize('hr_admin', 'superadmin'), deleteAttendance);

export default router;
