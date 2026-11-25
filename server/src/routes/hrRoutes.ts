// @ts-nocheck
import express from 'express';
import {
  getLeaveRequests,
  getLeaveRequest,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  approveLeave,
  deptApproveLeave,
  hrApproveLeave,
  getLeaveStats,
  getMyLeaves,
  getMyLeaveBalance,
  getVacancies,
  getVacancy,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  closeVacancy,
  validateVacancyForHiring,
  fillVacancyPosition,
  getVacancyStats,
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  resolveComplaint,
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/hrController.js';
import {
  getAttendance,
  getAttendanceById,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getMyAttendanceSummary,
  getActivityReport,
} from '../controllers/attendanceController.js';
import {
  getEmployeeProfile,
  upsertEmployeeProfile,
  uploadEmployeeDocument,
  updateEmployeeDocument,
  deleteEmployeeDocument,
  updateKPIs,
  updateKRAs,
  updateSalaryDetails,
} from '../controllers/employeeProfileController.js';
import {
  getPolls,
  createPoll,
  updatePoll,
  deletePoll,
  votePoll,
} from '../controllers/pollController.js';
import {
  getSalaryConfigs,
  getSalaryConfig,
  upsertSalaryConfig,
  deleteSalaryConfig,
  getLeaveAllocations,
  getLeaveAllocation,
  upsertLeaveAllocation,
  bulkInitLeaveAllocations,
  carryForwardLeaveAllocations,
  generateSmartPayroll,
} from '../controllers/salaryController.js';
import { getHRTadaClaims, hrVerifyExpense } from '../controllers/financeController.js';
import { protect, authorize, requirePayrollAccess } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Leave Requests
router.route('/leaves').get(getLeaveRequests).post(createLeaveRequest);
router.route('/leaves/stats').get(authorize('hr_admin', 'hr_sub_admin', 'dept_admin', 'ceo', 'org_admin', 'superadmin'), getLeaveStats);
router.get('/leaves/my', getMyLeaves);
router.get('/leaves/my-balance', getMyLeaveBalance);
router.route('/leaves/:id')
  .get(getLeaveRequest)
  .put(updateLeaveRequest)
  .delete(deleteLeaveRequest);

const DEPT_APPROVE_ROLES = [
  'hr_admin', 'hr_sub_admin',
  'ops_admin', 'ops_sub_admin',
  'finance_admin', 'finance_sub_admin', 'finance',
  'sales_admin', 'sales_sub_admin',
  'center_admin', 'branch_manager',
  'org_admin', 'superadmin', 'ceo', 'general_manager', 'project_manager',
];

router.put('/leaves/:id/approve', authorize(...DEPT_APPROVE_ROLES), approveLeave);
router.patch('/leaves/:id/dept-approve', authorize(...DEPT_APPROVE_ROLES), deptApproveLeave);
router.patch('/leaves/:id/hr-approve', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo', 'general_manager'), hrApproveLeave);

// Attendance
router.get('/attendance/my-summary', getMyAttendanceSummary);
router.get('/attendance/activity-report', authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), getActivityReport);
router.route('/attendance')
  .get(authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin', 'general_manager'), getAttendance)
  .post(authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin', 'general_manager'), markAttendance);
router.route('/attendance/:id')
  .get(getAttendanceById)
  .put(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), updateAttendance)
  .delete(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'), deleteAttendance);

// Vacancies
router.route('/vacancies').get(getVacancies).post(authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), createVacancy);
router.route('/vacancies/stats').get(authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), getVacancyStats);
router.route('/vacancies/:id')
  .get(getVacancy)
  .put(authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), updateVacancy)
  .delete(authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), deleteVacancy);
router.put('/vacancies/:id/close', authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), closeVacancy);
router.get('/vacancies/:id/validate', authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), validateVacancyForHiring);
router.patch('/vacancies/:id/fill', authorize('hr_admin', 'hr_sub_admin', 'ceo', 'org_admin', 'superadmin'), fillVacancyPosition);

// Complaints
router.route('/complaints').get(getComplaints).post(createComplaint);
router.route('/complaints/:id')
  .get(getComplaint)
  .put(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updateComplaint)
  .delete(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), deleteComplaint);
router.put('/complaints/:id/resolve', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), resolveComplaint);

// Holidays
router.route('/holidays')
  .get(getHolidays)
  .post(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), createHoliday);
router.route('/holidays/:id')
  .get(getHoliday)
  .put(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updateHoliday)
  .delete(authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), deleteHoliday);

// Salary Configuration — Restricted exclusively to Payroll Authorized Users (Shaju Sir & Pramod Sir)
router.get('/salary-configs', requirePayrollAccess, getSalaryConfigs);
router.route('/salary-configs/:userId')
  .get(requirePayrollAccess, getSalaryConfig)
  .put(requirePayrollAccess, upsertSalaryConfig)
  .delete(requirePayrollAccess, deleteSalaryConfig);

// Leave Allocations & Carry Forward
router.get('/leave-allocations', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'), getLeaveAllocations);
router.post('/leave-allocations/bulk-init', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'), bulkInitLeaveAllocations);
router.post('/leave-allocations/carry-forward', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'), carryForwardLeaveAllocations);
router.route('/leave-allocations/:userId')
  .get(authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'), getLeaveAllocation)
  .put(authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin'), upsertLeaveAllocation);

// Smart Payroll Generation — Restricted exclusively to Payroll Authorized Users
router.post('/payroll/generate-smart', requirePayrollAccess, generateSmartPayroll);

// Employee Profiles & Document Upload / Maintenance (access checked inside controller for self or HR/Admin)
router.get('/employee-profiles/:userId', getEmployeeProfile);
router.put('/employee-profiles/:userId', upsertEmployeeProfile);
router.post('/employee-profiles/:userId/documents', upload.single('file'), uploadEmployeeDocument);
router.put('/employee-profiles/:userId/documents/:docId', upload.single('file'), updateEmployeeDocument);
router.delete('/employee-profiles/:userId/documents/:docId', deleteEmployeeDocument);
router.patch('/employee-profiles/:userId/kpis', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updateKPIs);
router.patch('/employee-profiles/:userId/kras', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updateKRAs);
router.patch('/employee-profiles/:userId/salary', requirePayrollAccess, updateSalaryDetails);

// TA/DA Claims — HR Verification & Approval Queue (Mandatory Step 1 before Finance)
router.get('/tada-claims', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin', 'general_manager'), getHRTadaClaims);
router.put('/tada-claims/:id/verify', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'superadmin', 'general_manager'), hrVerifyExpense);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), createAnnouncement);
router.put('/announcements/:id', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updateAnnouncement);
router.delete('/announcements/:id', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), deleteAnnouncement);

// Polls
router.get('/polls', getPolls);
router.post('/polls', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), createPoll);
router.put('/polls/:id', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), updatePoll);
router.delete('/polls/:id', authorize('hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo'), deletePoll);
router.post('/polls/:id/vote', votePoll);

export default router;
