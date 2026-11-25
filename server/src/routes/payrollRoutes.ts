// @ts-nocheck
import express from 'express';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  processSalaryArrears,
  processPayroll,
  markPayrollPaid,
  deletePayroll,
  generateMonthlyPayroll,
  generateSmartPayroll,
  confirmPayroll,
  transferToFinance,
  getPayrollBatches,
  getPayrollBatch,
  financeApprovePayrollBatch,
  financeRejectPayrollBatch,
  markBatchPaymentInProgress,
  completeBatchPayment,
} from '../controllers/payrollController.js';
import { protect, requirePayrollAccess, requirePayrollFinanceApprover } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Payroll batches: HR + Shaju Sir + Pramod Sir can view; Finance approval & payment strictly Shaju Sir & Pramod Sir
router.get('/batches', requirePayrollAccess, getPayrollBatches);
router.get('/batches/:id', requirePayrollAccess, getPayrollBatch);
router.post('/batches/:id/approve', requirePayrollFinanceApprover, financeApprovePayrollBatch);
router.post('/batches/:id/reject', requirePayrollFinanceApprover, financeRejectPayrollBatch);
router.put('/batches/:id/payment-in-progress', requirePayrollFinanceApprover, markBatchPaymentInProgress);
router.put('/batches/:id/complete-payment', requirePayrollFinanceApprover, completeBatchPayment);

// Payroll actions (HR + Shaju Sir + Pramod Sir)
router.post('/generate', requirePayrollAccess, generateMonthlyPayroll);
router.post('/generate-smart', requirePayrollAccess, generateSmartPayroll);
router.post('/arrears', requirePayrollAccess, processSalaryArrears);
router.post('/transfer-to-finance', requirePayrollAccess, transferToFinance);

// Payroll CRUD (GET allows personal payslip when ?employeeId=<self>, enforced inside controller)
router.route('/').get(getPayrolls).post(requirePayrollAccess, createPayroll);
router.route('/:id').get(getPayroll).put(requirePayrollAccess, updatePayroll).delete(requirePayrollAccess, deletePayroll);

// Payroll instance actions
router.put('/:id/process', requirePayrollAccess, processPayroll);
router.put('/:id/confirm', requirePayrollAccess, confirmPayroll);
router.put('/:id/pay', requirePayrollFinanceApprover, markPayrollPaid);

export default router;
