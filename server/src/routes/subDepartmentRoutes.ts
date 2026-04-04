import express from 'express';
import {
  createSubDepartment,
  getSubDepartments,
  getSubDepartment,
  updateSubDepartment,
  deleteSubDepartment,
  getMySubDepartment,
} from '../controllers/subDepartmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// My sub-department (must be before /:id to avoid conflict)
router.get('/my', getMySubDepartment);

// All authenticated users can view sub-departments
router.get('/', getSubDepartments);
router.get('/:id', getSubDepartment);

// Only admins can create/update/delete
router.post('/', authorize('ops_admin', 'sales_admin', 'org_admin', 'superadmin'), createSubDepartment);
router.patch('/:id', authorize('ops_admin', 'sales_admin', 'org_admin', 'superadmin', 'hr_admin'), updateSubDepartment);
router.delete('/:id', authorize('ops_admin', 'sales_admin', 'org_admin', 'superadmin'), deleteSubDepartment);

export default router;
