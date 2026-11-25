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
import { protect, requirePayrollAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// All Payroll management & batch operations restricted exclusively to Shaju Sir & Pramod Sir
router.get('/batches', requirePayrollAccess, getPayrollBatches);
router.get('/batches/:id', requirePayrollAccess, getPayrollBatch);
router.post('/batches/:id/approve', requirePayrollAccess, financeApprovePayrollBatch);
router.post('/batches/:id/reject', requirePayrollAccess, financeRejectPayrollBatch);
router.put('/batches/:id/payment-in-progress', requirePayrollAccess, markBatchPaymentInProgress);
router.put('/batches/:id/complete-payment', requirePayrollAccess, completeBatchPayment);

// Payroll actions (must come before /:id)
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
router.put('/:id/pay', requirePayrollAccess, markPayrollPaid);

export default router;
