// @ts-nocheck
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
import {
  createShift,
  getShifts,
  updateShift,
  deleteShift,
  assignShiftToEmployee,
  toggleEmployeeLateDeduction,
} from '../controllers/shiftController.js';

const router = express.Router();

const HR_ATTENDANCE_ADMINS = ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'];

// Shift Management Routes
router.get('/shifts', protect, authorize(...HR_ATTENDANCE_ADMINS), getShifts);
router.post('/shifts', protect, authorize(...HR_ATTENDANCE_ADMINS), createShift);
router.put('/shifts/:id', protect, authorize(...HR_ATTENDANCE_ADMINS), updateShift);
router.delete('/shifts/:id', protect, authorize(...HR_ATTENDANCE_ADMINS), deleteShift);
router.post('/shifts/assign', protect, authorize(...HR_ATTENDANCE_ADMINS), assignShiftToEmployee);

// Per-employee late deduction toggle
router.put('/late-deduction/:employeeId', protect, authorize(...HR_ATTENDANCE_ADMINS, 'finance_admin'), toggleEmployeeLateDeduction);

// Static routes MUST come before /:id to avoid Express matching them as IDs

// HR Settings routes
router.get('/settings', protect, authorize(...HR_ATTENDANCE_ADMINS), getHRSettings);
router.post('/settings', protect, authorize(...HR_ATTENDANCE_ADMINS), createOrUpdateHRSettings);
router.put('/settings', protect, authorize(...HR_ATTENDANCE_ADMINS), createOrUpdateHRSettings);

// Biometric sync endpoint (called by biometric device/middleware)
router.post('/biometric-sync', protect, authorize(...HR_ATTENDANCE_ADMINS), biometricSync);

// Employee routes - punch in/out
router.post('/punch-in', protect, punchIn);
router.post('/punch-out', protect, punchOut);
router.get('/today', protect, getTodayAttendance);
router.get('/late-summary', protect, getMonthlyLateSummary);

// HR routes - view all attendances
router.get('/', protect, authorize(...HR_ATTENDANCE_ADMINS), getAttendances);
router.post('/', protect, authorize(...HR_ATTENDANCE_ADMINS), createAttendance);
router.put('/:id', protect, authorize(...HR_ATTENDANCE_ADMINS), updateAttendance);
router.delete('/:id', protect, authorize(...HR_ATTENDANCE_ADMINS), deleteAttendance);

export default router;
