import express from 'express';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  assignLicense,
} from '../controllers/organizationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize('superadmin', 'org_admin', 'ceo', 'hr_admin', 'finance_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'bde', 'employee'), getOrganizations)
  .post(authorize('superadmin'), auditLog('create', 'Organization'), createOrganization);

router
  .route('/:id')
  .get(getOrganization)
  .put(authorize('superadmin', 'org_admin'), auditLog('update', 'Organization'), updateOrganization)
  .delete(authorize('superadmin'), auditLog('delete', 'Organization'), deleteOrganization);

router.put('/:id/license', authorize('superadmin'), assignLicense);

export default router;
