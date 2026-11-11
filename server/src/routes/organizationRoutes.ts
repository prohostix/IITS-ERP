// @ts-nocheck
import express from 'express';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  assignLicense,
  getSuperadminBilling,
  updateSuperadminBillingConfig,
} from '../controllers/organizationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.get('/superadmin-billing', authorize('superadmin'), getSuperadminBilling);
router.put('/superadmin-billing/config', authorize('superadmin'), updateSuperadminBillingConfig);

router
  .route('/')
  .get(authorize('superadmin', 'org_admin', 'ceo', 'hr_admin', 'finance_admin', 'finance', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'bde', 'employee'), getOrganizations)
  .post(authorize('superadmin'), auditLog('create', 'Organization'), createOrganization);

router
  .route('/:id')
  .get(getOrganization)
  .put(authorize('superadmin', 'org_admin'), auditLog('update', 'Organization'), updateOrganization)
  .delete(authorize('superadmin'), auditLog('delete', 'Organization'), deleteOrganization);

router.put('/:id/license', authorize('superadmin'), assignLicense);

export default router;
