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
} from '../controllers/financeController.js';
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
} from '../controllers/walletTopUpController.js';
import {
  getFinanceEnrollments,
  approveFinanceEnrollment,
  rejectFinanceEnrollment,
  getAllEnrollments,
} from '../controllers/financeEnrollmentController.js';
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
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Invoices
router.route('/invoices').get(getInvoices).post(createInvoice);
router.route('/invoices/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(authorize('finance_admin'), deleteInvoice);
router.put('/invoices/:id/approve', authorize('finance_admin'), approveInvoice);

// Payments
router.route('/payments').get(getPayments).post(authorize('finance_admin'), createPayment);
router.route('/payments/:id')
  .get(getPayment)
  .put(authorize('finance_admin'), updatePayment)
  .delete(authorize('finance_admin'), deletePayment);

// Expenses
router.route('/expenses').get(getExpenses).post(createExpense);
router.route('/expenses/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(authorize('finance_admin'), deleteExpense);
router.put('/expenses/:id/approve', authorize('finance_admin'), approveExpense);

// Targets
router.route('/targets').get(getTargets).post(authorize('finance_admin'), createTarget);
router.route('/targets/:id')
  .get(getTarget)
  .put(authorize('finance_admin'), updateTarget)
  .delete(authorize('finance_admin'), deleteTarget);

// Fee Structures
router.route('/fees').get(getFeeStructures).post(authorize('finance_admin'), createFeeStructure);
router.route('/fees/:id')
  .get(getFeeStructure)
  .put(authorize('finance_admin'), updateFeeStructure)
  .delete(authorize('finance_admin'), deleteFeeStructure);

// University Auth Fees
router.route('/auth-fees').get(authorize('finance_admin'), getAuthFees).post(authorize('finance_admin'), createAuthFee);
router.put('/auth-fees/:id', authorize('finance_admin'), updateAuthFee);

// Study Center Payment Verification & Creation
router.get('/centers/pending-payment', authorize('finance_admin'), getPendingPaymentCenters);
router.post('/centers', authorize('finance_admin', 'org_admin', 'superadmin'), createStudyCenter);
router.put('/centers/:id/finance-verify', authorize('finance_admin'), financeVerifyCenter);

// Program Fee Structures
router.route('/program-fees').get(authorize('finance_admin'), getProgramFees).post(authorize('finance_admin'), createProgramFee);
router.route('/program-fees/:id')
  .get(authorize('finance_admin'), getProgramFee)
  .put(authorize('finance_admin'), updateProgramFee)
  .delete(authorize('finance_admin'), deleteProgramFee);

// Wallet Top-Ups
router.get('/wallet-topups', authorize('finance_admin'), getWalletTopUps);
router.put('/wallet-topups/:id/approve', authorize('finance_admin'), approveWalletTopUp);
router.put('/wallet-topups/:id/reject', authorize('finance_admin'), rejectWalletTopUp);

// Finance Enrollment Review
router.get('/enrollments/all', authorize('finance_admin'), getAllEnrollments);
router.get('/enrollments', authorize('finance_admin'), getFinanceEnrollments);
router.put('/enrollments/:id/approve', authorize('finance_admin'), approveFinanceEnrollment);
router.put('/enrollments/:id/reject', authorize('finance_admin'), rejectFinanceEnrollment);

// Reports
router.get('/reports/income-expenditure', authorize('finance_admin'), getIncomeExpenditureReport);

// Sales users (for target assignment)
router.get('/sales-users', authorize('finance_admin'), getFinanceSalesUsers);

// Salary Config Approval
router.get('/salary-configs', authorize('finance_admin'), getFinanceSalaryConfigs);
router.put('/salary-configs/:id/approve', authorize('finance_admin'), approveSalaryConfig);

// Payroll Batches (from HR)
router.get('/payroll-batches', authorize('finance_admin', 'hr_admin'), getPayrollBatches);
router.get('/payroll-batches/:id', authorize('finance_admin', 'hr_admin'), getPayrollBatch);
router.post('/payroll-batches/:id/approve', authorize('finance_admin'), financeApprovePayrollBatch);
router.post('/payroll-batches/:id/reject', authorize('finance_admin'), financeRejectPayrollBatch);
router.put('/payroll-batches/:id/payment-in-progress', authorize('finance_admin'), markBatchPaymentInProgress);
router.put('/payroll-batches/:id/complete-payment', authorize('finance_admin'), completeBatchPayment);

export default router;
