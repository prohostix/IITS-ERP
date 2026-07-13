// @ts-nocheck
import express from 'express';
import {
  getUniversities,
  getUniversity,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  activateUniversity,
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  activateProgram,
  getStudyCenters,
  getStudyCenter,
  createStudyCenter,
  updateStudyCenter,
  deleteStudyCenter,
  approveStudyCenter,
  suspendStudyCenter,
  getAdmissionSessions,
  getAdmissionSession,
  createAdmissionSession,
  updateAdmissionSession,
  deleteAdmissionSession,
  approveAdmissionSession,
  duplicateSession,
  getInternalMarks,
  createInternalMark,
  updateInternalMark,
  deleteInternalMark,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPendingVerificationCenters,
  verifyCenter,
  getProgramAllocations,
  allocateProgram,
  removeAllocation,
  getUniversityAllocations,
  allocateUniversity,
  removeUniversityAllocation,
  bulkImportStudyCenters,
  updateBranchSettings,
} from '../controllers/operationsController.js';
import {
  getProgramDetail,
  getProgramMaterials,
  uploadProgramMaterial,
  updateProgramMaterial,
  deleteProgramMaterial,
} from '../controllers/programMaterialController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Universities — write access restricted to org_admin / superadmin & operations admin
router.route('/universities').get(getUniversities).post(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), createUniversity);
router.route('/universities/:id')
  .get(getUniversity)
  .put(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), updateUniversity)
  .delete(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), deleteUniversity);
router.put('/universities/:id/activate', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), activateUniversity);

// Programs — write access restricted to org_admin / superadmin & operations admin
router.route('/programs').get(getPrograms).post(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), createProgram);
router.route('/programs/:id')
  .get(getProgram)
  .put(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), updateProgram)
  .delete(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), deleteProgram);
router.put('/programs/:id/activate', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), activateProgram);

// Onboarding — document verification (must be before /centers/:id to avoid route conflict)
router.get('/centers/pending-verification', authorize('ops_admin', 'ops_sub_admin', 'employee'), getPendingVerificationCenters);
router.put('/centers/:id/verify', authorize('ops_admin', 'ops_sub_admin', 'employee'), verifyCenter);

// Study Centers Bulk Import
router.post('/centers/bulk-import', authorize('org_admin', 'superadmin', 'ops_admin'), bulkImportStudyCenters);

// Branch-level settings (must be before /centers/:id)
router.put('/centers/branch-settings', authorize('org_admin', 'superadmin'), updateBranchSettings);

// Study Centers
router.route('/centers')
  .get(getStudyCenters)
  .post(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'bde', 'employee'), createStudyCenter);
router.route('/centers/:id')
  .get(getStudyCenter)
  .put(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), updateStudyCenter)
  .delete(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), deleteStudyCenter);
router.put('/centers/:id/approve', authorize('ops_admin', 'finance_admin'), approveStudyCenter);
router.put('/centers/:id/suspend', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), suspendStudyCenter);

// Admission Sessions
router.route('/sessions').get(getAdmissionSessions).post(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), createAdmissionSession);
router.route('/sessions/:id')
  .get(getAdmissionSession)
  .put(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), updateAdmissionSession)
  .delete(authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), deleteAdmissionSession);
router.put('/sessions/:id/approve', authorize('finance_admin'), approveAdmissionSession);
router.post('/sessions/:id/duplicate', authorize('org_admin', 'superadmin', 'ops_admin', 'ops_sub_admin'), duplicateSession);

// Internal Marks — study centers enter marks, ops has read-only
router.route('/marks').get(getInternalMarks).post(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), createInternalMark);
router.route('/marks/:id').put(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), updateInternalMark).delete(authorize('center_admin', 'ops_admin', 'org_admin', 'superadmin'), deleteInternalMark);

// Announcements
router.route('/announcements').get(getAnnouncements).post(authorize('ops_admin', 'hr_admin'), createAnnouncement);
router.route('/announcements/:id')
  .get(getAnnouncement)
  .put(authorize('ops_admin', 'hr_admin'), updateAnnouncement)
  .delete(authorize('ops_admin', 'hr_admin'), deleteAnnouncement);

// Onboarding — program allocation
router.route('/centers/:id/allocations')
  .get(authorize('ops_admin', 'ops_sub_admin', 'employee'), getProgramAllocations)
  .post(authorize('ops_admin', 'ops_sub_admin', 'employee'), allocateProgram);
router.delete('/centers/:id/allocations/:allocId', authorize('ops_admin', 'ops_sub_admin', 'employee'), removeAllocation);

// Onboarding — university allocation
router.route('/centers/:id/uni-allocations')
  .get(authorize('ops_admin', 'ops_sub_admin', 'employee'), getUniversityAllocations)
  .post(authorize('ops_admin', 'ops_sub_admin', 'employee'), allocateUniversity);
router.delete('/centers/:id/uni-allocations/:allocId', authorize('ops_admin', 'ops_sub_admin', 'employee'), removeUniversityAllocation);

// Program detail & materials
router.get('/programs/:programId/detail', getProgramDetail);
router.get('/programs/:programId/materials', getProgramMaterials);
router.post('/programs/:programId/materials', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), upload.single('file'), uploadProgramMaterial);
router.put('/programs/:programId/materials/:materialId', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), upload.single('file'), updateProgramMaterial);
router.delete('/programs/:programId/materials/:materialId', authorize('ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'), deleteProgramMaterial);

export default router;
