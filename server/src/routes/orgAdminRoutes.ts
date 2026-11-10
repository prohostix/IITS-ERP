// @ts-nocheck
import express from 'express';
import {
  createCeoPanel, getCeoPanels, getCeoPanel, updateCeoPanel, deleteCeoPanel,
  createCustomDepartment, getCustomDepartments,
  getOrgHierarchy, assignHierarchy, syncHierarchyReporting,
  getDesignations, createDesignation, updateDesignation, deleteDesignation,
  assignUserToDesignation, unassignUserFromDesignation,
} from '../controllers/orgAdminController.js';
import {
  getBranches, getBranch, createBranch, updateBranch, deleteBranch,
  assignBranchManager, updateBranchDepartments, getMyBranch,
} from '../controllers/branchController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Branch manager self-service — accessible to any authenticated user with a branchId
router.get('/branches/my', getMyBranch);

// Branch read — accessible to any authenticated user (needed by various panels)
router.get('/branches', getBranches);
router.get('/branches/:id', getBranch);

router.use(authorize('org_admin', 'superadmin', 'hr_admin', 'hr_sub_admin', 'ceo', 'finance_admin', 'finance', 'ops_admin', 'ops_sub_admin', 'sales_admin'));

// CEO Panel routes
router.route('/ceo-panels').get(getCeoPanels).post(createCeoPanel);
router.route('/ceo-panels/:id').get(getCeoPanel).patch(updateCeoPanel).delete(deleteCeoPanel);

// Custom Department routes
router.route('/departments/custom').get(getCustomDepartments).post(createCustomDepartment);

// Hierarchy routes
router.get('/hierarchy', getOrgHierarchy);
router.patch('/hierarchy/assign', assignHierarchy);
router.post('/hierarchy/sync', syncHierarchyReporting);

// Designation routes
router.route('/designations').get(getDesignations).post(createDesignation);
router.route('/designations/:id').patch(updateDesignation).delete(deleteDesignation);
router.patch('/designations/:id/assign', assignUserToDesignation);
router.patch('/designations/:id/unassign', unassignUserFromDesignation);

// Branch write routes (admin-only)
router.post('/branches', createBranch);
router.patch('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);
router.patch('/branches/:id/manager', assignBranchManager);
router.patch('/branches/:id/departments', updateBranchDepartments);

export default router;
