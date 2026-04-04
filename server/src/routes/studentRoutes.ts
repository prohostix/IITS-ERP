import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  approveStudent,
  deleteStudent,
  getInternalMarks,
  getInternalMark,
  createInternalMark,
  updateInternalMark,
  deleteInternalMark,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Internal marks routes (must come before /:id routes)
router.route('/marks').get(getInternalMarks).post(authorize('ops_admin', 'employee'), createInternalMark);
router.route('/marks/:id').get(getInternalMark).put(authorize('ops_admin', 'employee'), updateInternalMark).delete(authorize('ops_admin'), deleteInternalMark);

// Student routes
router.route('/').get(getStudents).post(authorize('org_admin', 'superadmin', 'center_admin'), createStudent);
router.route('/:id').get(getStudent).put(authorize('org_admin', 'superadmin', 'center_admin'), updateStudent).delete(authorize('org_admin', 'superadmin'), deleteStudent);
router.put('/:id/approve', authorize('finance_admin', 'ops_admin'), approveStudent);

export default router;
