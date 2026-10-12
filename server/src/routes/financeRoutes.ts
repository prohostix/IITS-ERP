// @ts-nocheck
import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getTargets,
  getTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  getFeeStructures,
  getFeeStructure,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getAuthFees,
  createAuthFee,
  updateAuthFee,
  getPendingPaymentCenters,
  financeVerifyCenter,
  createStudyCenter,
  getIncomeExpenditureReport,
  getFinanceSalesUsers,
  getUniversityFeePayments,
  payUniversityFee,
  getTotalReport,
  getReregPendingReport,
  getReregCompletedReport,
  getUniversityWalletLedger,
  addUniversityWalletTransaction
} from '../controllers/financeController.js';
import { upload } from '../middleware/upload.js';
import {
  getProgramFees,
  getProgramFee,
  createProgramFee,
  updateProgramFee,
  deleteProgramFee,
} from '../controllers/programFeeController.js';
import {
  getWalletTopUps,
  approveWalletTopUp,
  rejectWalletTopUp,
  getWalletLedger,
} from '../controllers/walletTopUpController.js';
import {
  getFinanceEnrollments,
  approveFinanceEnrollment,
  rejectFinanceEnrollment,
  getAllEnrollments,
  processRefund,
} from '../controllers/financeEnrollmentController.js';
import {
  getStudentPaymentLogs,
  recordReceipt,
  addExtraFee,
} from '../controllers/financeStudentPaymentController.js';
import {
  getFinanceSalaryConfigs,
  approveSalaryConfig,
} from '../controllers/salaryController.js';
import {
  getPayrollBatches,
  getPayrollBatch,
  financeApprovePayrollBatch,
  financeRejectPayrollBatch,
  markBatchPaymentInProgress,
  completeBatchPayment,
} from '../controllers/payrollController.js';
import {
  getCommissionAgainstUniversityReport,
  getUniversityFeePaymentReport,
  getReregPaymentReport,
  getStudentLedgerList,
  getStudentLedgerDetails,
  getCenterLedgerList,
  getCenterLedgerDetails,
} from '../controllers/financeLedgerReportsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Invoices
router.route('/invoices').get(getInvoices).post(createInvoice);
router.route('/invoices/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deleteInvoice);
router.put('/invoices/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), approveInvoice);

// Payments
router.route('/payments').get(getPayments).post(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), createPayment);
router.route('/payments/:id')
  .get(getPayment)
  .put(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), updatePayment)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deletePayment);

// Expenses
router.route('/expenses').get(getExpenses).post(createExpense);
router.route('/expenses/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deleteExpense);
router.put('/expenses/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), approveExpense);

// Targets
router.route('/targets').get(getTargets).post(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), createTarget);
router.route('/targets/:id')
  .get(getTarget)
  .put(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), updateTarget)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deleteTarget);

// Fee Structures
router.route('/fees').get(getFeeStructures).post(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), createFeeStructure);
router.route('/fees/:id')
  .get(getFeeStructure)
  .put(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), updateFeeStructure)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deleteFeeStructure);

// University Auth Fees
router.route('/auth-fees').get(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getAuthFees).post(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), createAuthFee);
router.put('/auth-fees/:id', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), updateAuthFee);

// Study Center Payment Verification & Creation
router.get('/centers/pending-payment', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getPendingPaymentCenters);
router.post('/centers', authorize('finance_admin', 'finance', 'org_admin', 'superadmin'), createStudyCenter);
router.put('/centers/:id/finance-verify', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), financeVerifyCenter);

// Program Fee Structures
router.route('/program-fees').get(getProgramFees).post(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), createProgramFee);
router.route('/program-fees/:id')
  .get(getProgramFee)
  .put(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), updateProgramFee)
  .delete(authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), deleteProgramFee);

// Wallet Top-Ups
router.get('/wallet-topups', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getWalletTopUps);
router.put('/wallet-topups/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), approveWalletTopUp);
router.put('/wallet-topups/:id/reject', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), rejectWalletTopUp);
router.get('/wallet-ledger', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getWalletLedger);

// Student Payments (Finance)
router.get('/student-payments', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getStudentPaymentLogs);
router.post('/student-payments/:id/receipt', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), recordReceipt);
router.post('/student-payments/:id/extra-fee', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), addExtraFee);

// Finance Enrollment Review
router.get('/enrollments/all', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getAllEnrollments);
router.get('/enrollments', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getFinanceEnrollments);
router.put('/enrollments/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), approveFinanceEnrollment);
router.put('/enrollments/:id/reject', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), rejectFinanceEnrollment);
router.post('/enrollments/:id/refund', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), processRefund);

// Reports
router.get('/reports/income-expenditure', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getIncomeExpenditureReport);

// Sales users (for target assignment)
router.get('/sales-users', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getFinanceSalesUsers);

// University Fee Payments
router.get('/university-fees', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getUniversityFeePayments);
router.post('/university-fees/:id/pay', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), upload.single('screenshot'), payUniversityFee);

// Salary Config Approval
router.get('/salary-configs', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getFinanceSalaryConfigs);
router.put('/salary-configs/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), approveSalaryConfig);

// Payroll Batches (from HR)
router.get('/payroll-batches', authorize('finance_admin', 'finance', 'hr_admin', 'superadmin', 'org_admin'), getPayrollBatches);
router.get('/payroll-batches/:id', authorize('finance_admin', 'finance', 'hr_admin', 'superadmin', 'org_admin'), getPayrollBatch);
router.post('/payroll-batches/:id/approve', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), financeApprovePayrollBatch);
router.post('/payroll-batches/:id/reject', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), financeRejectPayrollBatch);
router.put('/payroll-batches/:id/payment-in-progress', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), markBatchPaymentInProgress);
router.put('/payroll-batches/:id/complete-payment', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), completeBatchPayment);

// Total Data Report
router.get('/total-report', getTotalReport);

// Re-Reg Pending Report
router.get('/rereg-pending-report', authorize('finance_admin', 'finance', 'center_admin'), getReregPendingReport);
router.get('/rereg-completed-report', authorize('finance_admin', 'finance', 'center_admin'), getReregCompletedReport);

// University Wallet Ledger
router.get('/university-wallet/:universityId', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), getUniversityWalletLedger);
router.post('/university-wallet/:universityId', authorize('finance_admin', 'finance', 'superadmin', 'org_admin'), addUniversityWalletTransaction);

// ─── Commission Report Against University ─────────────────────────────────────
router.get('/reports/commission-against-university', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), getCommissionAgainstUniversityReport);

// ─── University Fee Payment Report ────────────────────────────────────────────
router.get('/reports/university-fee-payments', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), getUniversityFeePaymentReport);

// ─── Re-Registration Fee Payment Report ────────────────────────────────────────
router.get('/reports/rereg-payments', authorize('finance_admin', 'finance_sub_admin', 'finance', 'center_admin', 'superadmin', 'org_admin', 'ceo'), getReregPaymentReport);

// ─── Student Ledger ───────────────────────────────────────────────────────────
router.get('/student-ledger', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'center_admin', 'ceo'), getStudentLedgerList);
router.get('/student-ledger/:id', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'center_admin', 'ceo'), getStudentLedgerDetails);

// ─── Center Ledger (Study Center Ledger) ──────────────────────────────────────
router.get('/center-ledger', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'ceo'), getCenterLedgerList);
router.get('/center-ledger/:centerId', authorize('finance_admin', 'finance_sub_admin', 'finance', 'superadmin', 'org_admin', 'center_admin', 'ceo'), getCenterLedgerDetails);

export default router;
