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
  getMyAttendance,
  getMyAttendanceSummary,
  getActivityReport,
} from '../controllers/attendanceController.js';
import {
  getEmployeeProfile,
  upsertEmployeeProfile,
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
  generateSmartPayroll,
} from '../controllers/salaryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Leave Requests
router.route('/leaves').get(getLeaveRequests).post(createLeaveRequest);
router.route('/leaves/stats').get(authorize('hr_admin', 'dept_admin'), getLeaveStats);
router.get('/leaves/my', getMyLeaves);
router.route('/leaves/:id')
  .get(getLeaveRequest)
  .put(updateLeaveRequest)
  .delete(deleteLeaveRequest);
router.put('/leaves/:id/approve', authorize('hr_admin', 'ops_admin', 'finance_admin', 'sales_admin', 'center_admin'), approveLeave);
router.patch('/leaves/:id/dept-approve', authorize('ops_admin', 'finance_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'), deptApproveLeave);
router.patch('/leaves/:id/hr-approve', authorize('hr_admin'), hrApproveLeave);

// Attendance
router.get('/attendance/my', getMyAttendance);
router.get('/attendance/my-summary', getMyAttendanceSummary);
router.get('/attendance/activity-report', authorize('hr_admin', 'ceo', 'org_admin'), getActivityReport);
router.route('/attendance').get(authorize('hr_admin', 'org_admin', 'ceo'), getAttendance).post(authorize('hr_admin'), markAttendance);
router.route('/attendance/:id')
  .get(getAttendanceById)
  .put(authorize('hr_admin'), updateAttendance)
  .delete(authorize('hr_admin'), deleteAttendance);

// Vacancies
router.route('/vacancies').get(getVacancies).post(authorize('hr_admin'), createVacancy);
router.route('/vacancies/stats').get(authorize('hr_admin'), getVacancyStats);
router.route('/vacancies/:id')
  .get(getVacancy)
  .put(authorize('hr_admin'), updateVacancy)
  .delete(authorize('hr_admin'), deleteVacancy);
router.put('/vacancies/:id/close', authorize('hr_admin'), closeVacancy);
router.get('/vacancies/:id/validate', authorize('hr_admin'), validateVacancyForHiring);
router.patch('/vacancies/:id/fill', authorize('hr_admin'), fillVacancyPosition);

// Complaints
router.route('/complaints').get(getComplaints).post(createComplaint);
router.route('/complaints/:id')
  .get(getComplaint)
  .put(authorize('hr_admin'), updateComplaint)
  .delete(authorize('hr_admin'), deleteComplaint);
router.put('/complaints/:id/resolve', authorize('hr_admin'), resolveComplaint);

// Holidays
router.route('/holidays').get(getHolidays).post(authorize('hr_admin'), createHoliday);
router.route('/holidays/:id')
  .get(getHoliday)
  .put(authorize('hr_admin'), updateHoliday)
  .delete(authorize('hr_admin'), deleteHoliday);

// Salary Configuration (per employee)
router.get('/salary-configs', authorize('hr_admin'), getSalaryConfigs);
router.route('/salary-configs/:userId')
  .get(authorize('hr_admin'), getSalaryConfig)
  .put(authorize('hr_admin'), upsertSalaryConfig)
  .delete(authorize('hr_admin'), deleteSalaryConfig);

// Leave Allocations
router.get('/leave-allocations', authorize('hr_admin'), getLeaveAllocations);
router.post('/leave-allocations/bulk-init', authorize('hr_admin'), bulkInitLeaveAllocations);
router.route('/leave-allocations/:userId')
  .get(authorize('hr_admin'), getLeaveAllocation)
  .put(authorize('hr_admin'), upsertLeaveAllocation);

// Smart Payroll Generation (uses salary configs + late deductions)
router.post('/payroll/generate-smart', authorize('hr_admin'), generateSmartPayroll);

// Employee Profiles (KPI / KRA / Salary details)
router.get('/employee-profiles/:userId', authorize('hr_admin'), getEmployeeProfile);
router.put('/employee-profiles/:userId', authorize('hr_admin'), upsertEmployeeProfile);
router.patch('/employee-profiles/:userId/kpis', authorize('hr_admin'), updateKPIs);
router.patch('/employee-profiles/:userId/kras', authorize('hr_admin'), updateKRAs);
router.patch('/employee-profiles/:userId/salary', authorize('hr_admin'), updateSalaryDetails);

// Announcements (HR creates, all org members can read)
router.get('/announcements', getAnnouncements);
router.post('/announcements', authorize('hr_admin'), createAnnouncement);
router.put('/announcements/:id', authorize('hr_admin'), updateAnnouncement);
router.delete('/announcements/:id', authorize('hr_admin'), deleteAnnouncement);

// Polls (HR creates, all org members can view and vote)
router.get('/polls', getPolls);
router.post('/polls', authorize('hr_admin'), createPoll);
router.put('/polls/:id', authorize('hr_admin'), updatePoll);
router.delete('/polls/:id', authorize('hr_admin'), deletePoll);
router.post('/polls/:id/vote', votePoll);

export default router;
