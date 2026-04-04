import express from 'express';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignManager,
  removeManager,
  addAssistantManager,
  removeAssistantManager,
  getSubDepartments,
  createSubDepartment,
  getDepartmentHierarchy,
  getMyDepartments,
} from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get departments managed by current user
router.get('/my-departments', getMyDepartments);

router
  .route('/')
  .get(getDepartments)
  .post(authorize('superadmin', 'org_admin'), createDepartment);

router
  .route('/:id')
  .get(getDepartment)
  .put(authorize('superadmin', 'org_admin'), updateDepartment)
  .delete(authorize('superadmin', 'org_admin'), deleteDepartment);

// Manager management
router.put('/:id/assign-manager', authorize('superadmin', 'org_admin', 'hr_admin'), assignManager);
router.delete('/:id/remove-manager', authorize('superadmin', 'org_admin', 'hr_admin'), removeManager);

// Assistant manager management
router.post('/:id/assistant-managers', authorize('superadmin', 'org_admin'), addAssistantManager);
router.delete('/:id/assistant-managers/:userId', authorize('superadmin', 'org_admin'), removeAssistantManager);

// Sub-departments
router.get('/:id/sub-departments', getSubDepartments);
router.post('/:id/sub-departments', authorize('superadmin', 'org_admin'), createSubDepartment);

// Department hierarchy
router.get('/:id/hierarchy', getDepartmentHierarchy);

export default router;
