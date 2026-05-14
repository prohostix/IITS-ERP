import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all payroll records
export const getPayrolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  
  if (req.query.month) query.month = req.query.month;
  if (req.query.status) query.status = req.query.status;
  if (req.query.employeeId) query.employeeId = req.query.employeeId;

  const payrolls = await Payroll.find(query)
    .populate('employeeId', 'employeeId joinDate salary')
    .populate({
      path: 'employeeId',
      populate: {
        path: 'userId',
        select: 'name email designation'
      }
    })
    .populate('processedBy', 'name email')
    .sort('-month');

  res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
});

// Get single payroll record
export const getPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employeeId', 'employeeId joinDate salary')
    .populate({
      path: 'employeeId',
      populate: {
        path: 'userId',
        select: 'name email designation phone'
      }
    })
    .populate('processedBy', 'name email');

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  res.status(200).json({ success: true, data: payroll });
});

// Create payroll record
export const createPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  // Calculate gross and net salary
  const allowancesTotal = Object.values(req.body.allowances || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  const deductionsTotal = Object.values(req.body.deductions || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  
  req.body.grossSalary = req.body.basicSalary + allowancesTotal + (req.body.bonus || 0) + (req.body.overtime || 0);
  req.body.netSalary = req.body.grossSalary - deductionsTotal;

  const payroll = await Payroll.create(req.body);
  res.status(201).json({ success: true, data: payroll });
});

// Update payroll record
export const updatePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  let payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  // Recalculate if amounts changed
  if (req.body.basicSalary || req.body.allowances || req.body.deductions || req.body.bonus || req.body.overtime) {
    const basicSalary = req.body.basicSalary || payroll.basicSalary;
    const allowances = req.body.allowances || payroll.allowances;
    const deductions = req.body.deductions || payroll.deductions;
    const bonus = req.body.bonus !== undefined ? req.body.bonus : payroll.bonus;
    const overtime = req.body.overtime !== undefined ? req.body.overtime : payroll.overtime;

    const allowancesTotal = Object.values(allowances).reduce((sum: number, val: any) => sum + (val || 0), 0);
    const deductionsTotal = Object.values(deductions).reduce((sum: number, val: any) => sum + (val || 0), 0);
    
    req.body.grossSalary = basicSalary + allowancesTotal + (bonus || 0) + (overtime || 0);
    req.body.netSalary = req.body.grossSalary - deductionsTotal;
  }

  payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: payroll });
});

// Process payroll (mark as processed)
export const processPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  payroll.status = 'processed';
  payroll.processedBy = req.user._id;
  payroll.processedAt = new Date();
  await payroll.save();

  res.status(200).json({ success: true, data: payroll });
});

// Mark payroll as paid
export const markPayrollPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  payroll.status = 'paid';
  payroll.paymentDate = req.body.paymentDate || new Date();
  payroll.paymentMethod = req.body.paymentMethod;
  payroll.paymentReference = req.body.paymentReference;
  payroll.remarks = req.body.remarks;
  await payroll.save();

  res.status(200).json({ success: true, data: payroll });
});

// Delete payroll record
export const deletePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await Payroll.findByIdAndDelete(req.params.id);

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Generate payroll for all employees for a month
export const generateMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body; // Format: YYYY-MM

  if (!month) {
    res.status(400).json({ success: false, message: 'Month is required (format: YYYY-MM)' });
    return;
  }

  // Get all employees
  const employees = await Employee.find({ 
    organizationId: req.user.organizationId 
  }).populate('userId', 'status');

  const payrollRecords = [];
  const errors = [];

  for (const employee of employees) {
    try {
      // Check if payroll already exists for this employee and month
      const existing = await Payroll.findOne({
        employeeId: employee._id,
        month: month
      });

      if (existing) {
        errors.push({ employeeId: employee.employeeId, error: 'Payroll already exists for this month' });
        continue;
      }

      // Skip if employee is inactive
      if ((employee.userId as any).status !== 'active') {
        continue;
      }

      const basicSalary = employee.salary || 0;
      
      // Calculate default allowances (can be customized)
      const hra = basicSalary * 0.4; // 40% HRA
      const transport = 2000;
      const medical = 1500;

      // Calculate default deductions
      const pf = basicSalary * 0.12; // 12% PF
      const tax = basicSalary * 0.1; // 10% tax (simplified)

      const grossSalary = basicSalary + hra + transport + medical;
      const netSalary = grossSalary - pf - tax;

      const payroll = await Payroll.create({
        organizationId: req.user.organizationId,
        employeeId: employee._id,
        month: month,
        basicSalary: basicSalary,
        allowances: {
          hra: hra,
          transport: transport,
          medical: medical,
        },
        deductions: {
          pf: pf,
          tax: tax,
        },
        grossSalary: grossSalary,
        netSalary: netSalary,
        status: 'draft',
      });

      payrollRecords.push(payroll);
    } catch (error: any) {
      errors.push({ employeeId: employee.employeeId, error: error.message });
    }
  }

  res.status(201).json({ 
    success: true, 
    message: `Generated ${payrollRecords.length} payroll records`,
    data: payrollRecords,
    errors: errors.length > 0 ? errors : undefined
  });
});

// Confirm payroll (HR confirms before transfer to finance)
export const confirmPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  if (payroll.status !== 'processed' && payroll.status !== 'draft') {
    res.status(400).json({ 
      success: false, 
      message: `Cannot confirm payroll with status: ${payroll.status}` 
    });
    return;
  }

  payroll.status = 'confirmed';
  payroll.confirmedBy = req.user._id;
  payroll.confirmedAt = new Date();
  await payroll.save();

  res.status(200).json({ 
    success: true, 
    data: payroll,
    message: 'Payroll confirmed successfully' 
  });
});

// Transfer confirmed payrolls to finance (create batch)
export const transferToFinance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { payrollIds, month, remarks } = req.body;

  if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Payroll IDs array is required' 
    });
    return;
  }

  // Import PayrollBatch model
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;

  // Fetch all payroll records
  const payrolls = await Payroll.find({
    _id: { $in: payrollIds },
    organizationId: req.user.organizationId,
    status: 'confirmed'
  });

  if (payrolls.length === 0) {
    res.status(400).json({ 
      success: false, 
      message: 'No confirmed payroll records found' 
    });
    return;
  }

  if (payrolls.length !== payrollIds.length) {
    res.status(400).json({ 
      success: false, 
      message: 'Some payroll records are not in confirmed status or not found' 
    });
    return;
  }

  // Calculate total amount
  const totalAmount = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

  // Create batch
  const batch = await PayrollBatch.create({
    organizationId: req.user.organizationId,
    month: month || payrolls[0].month,
    payrollIds: payrollIds,
    totalAmount: totalAmount,
    employeeCount: payrolls.length,
    transferredBy: req.user._id,
    remarks: remarks
  });

  // Update payroll records status
  await Payroll.updateMany(
    { _id: { $in: payrollIds } },
    { 
      status: 'transferred_to_finance',
      transferredToFinanceBy: req.user._id,
      transferredToFinanceAt: new Date()
    }
  );

  await batch.populate('transferredBy', 'name email');
  await batch.populate('payrollIds');

  res.status(201).json({ 
    success: true, 
    data: batch,
    message: `Transferred ${payrolls.length} payroll records to finance` 
  });
});

// Get payroll batches (for finance)
export const getPayrollBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;

  const query: any = { organizationId: req.user.organizationId };
  
  if (req.query.status) query.status = req.query.status;
  if (req.query.month) query.month = req.query.month;

  const batches = await PayrollBatch.find(query)
    .populate('transferredBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ 
    success: true, 
    count: batches.length, 
    data: batches 
  });
});

// Get single payroll batch
export const getPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;

  const batch = await PayrollBatch.findById(req.params.id)
    .populate('transferredBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .populate({
      path: 'payrollIds',
      populate: {
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email designation'
        }
      }
    });

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  res.status(200).json({ success: true, data: batch });
});

// Finance approve payroll batch
export const financeApprovePayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;

  const batch = await PayrollBatch.findById(req.params.id);

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  if (batch.status !== 'pending_finance_approval') {
    res.status(400).json({ 
      success: false, 
      message: `Cannot approve batch with status: ${batch.status}` 
    });
    return;
  }

  batch.status = 'approved_by_finance';
  batch.approvedBy = req.user._id;
  batch.approvedAt = new Date();
  batch.remarks = req.body.remarks || batch.remarks;
  await batch.save();

  // Update individual payroll records
  await Payroll.updateMany(
    { _id: { $in: batch.payrollIds } },
    { 
      financeApprovedBy: req.user._id,
      financeApprovedAt: new Date()
    }
  );

  await batch.populate('approvedBy', 'name email');

  res.status(200).json({ 
    success: true, 
    data: batch,
    message: 'Payroll batch approved by finance' 
  });
});

// Finance reject payroll batch
export const financeRejectPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    res.status(400).json({ 
      success: false, 
      message: 'Rejection reason is required' 
    });
    return;
  }

  const batch = await PayrollBatch.findById(req.params.id);

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  if (batch.status !== 'pending_finance_approval') {
    res.status(400).json({ 
      success: false, 
      message: `Cannot reject batch with status: ${batch.status}` 
    });
    return;
  }

  batch.status = 'rejected';
  batch.rejectedBy = req.user._id;
  batch.rejectedAt = new Date();
  batch.rejectionReason = rejectionReason;
  await batch.save();

  // Revert payroll records to confirmed status
  await Payroll.updateMany(
    { _id: { $in: batch.payrollIds } },
    { status: 'confirmed' }
  );

  await batch.populate('rejectedBy', 'name email');

  res.status(200).json({ 
    success: true, 
    data: batch,
    message: 'Payroll batch rejected' 
  });
});

// Mark batch as payment in progress
export const markBatchPaymentInProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;

  const batch = await PayrollBatch.findById(req.params.id);

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  if (batch.status !== 'approved_by_finance') {
    res.status(400).json({ 
      success: false, 
      message: `Cannot start payment for batch with status: ${batch.status}` 
    });
    return;
  }

  batch.status = 'payment_in_progress';
  await batch.save();

  res.status(200).json({ 
    success: true, 
    data: batch,
    message: 'Batch payment marked as in progress' 
  });
});

// Complete batch payment
export const completeBatchPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const PayrollBatch = (await import('../models/PayrollBatch.js')).default;
  const { paymentDate, paymentMethod, paymentReference } = req.body;

  const batch = await PayrollBatch.findById(req.params.id);

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  if (batch.status !== 'payment_in_progress' && batch.status !== 'approved_by_finance') {
    res.status(400).json({ 
      success: false, 
      message: `Cannot complete payment for batch with status: ${batch.status}` 
    });
    return;
  }

  batch.status = 'completed';
  batch.completedAt = new Date();
  await batch.save();

  // Update all payroll records in batch as paid
  await Payroll.updateMany(
    { _id: { $in: batch.payrollIds } },
    { 
      status: 'paid',
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod,
      paymentReference: paymentReference
    }
  );

  res.status(200).json({ 
    success: true, 
    data: batch,
    message: 'Batch payment completed successfully' 
  });
});
