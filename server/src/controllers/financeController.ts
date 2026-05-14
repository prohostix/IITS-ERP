import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import PaymentEntry from '../models/PaymentEntry.js';
import ExpenseClaim from '../models/ExpenseClaim.js';
import Target from '../models/Target.js';
import FeeStructure from '../models/FeeStructure.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Invoices
export const getInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.centerId) query.centerId = req.query.centerId;

  const invoices = await Invoice.find(query)
    .populate('centerId', 'name code')
    .populate('studentId', 'name enrollmentNo')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: invoices.length, data: invoices });
});

export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  // Auto-calculate GST if not provided
  if (!req.body.gstAmount && req.body.feeType) {
    try {
      const GSTSetting = (await import('../models/GSTSetting.js')).default;
      
      const gstSetting = await GSTSetting.findOne({
        organizationId: req.user.organizationId,
        feeType: req.body.feeType,
        status: 'active',
        applicableFrom: { $lte: new Date() },
        $or: [
          { applicableTo: { $exists: false } },
          { applicableTo: { $gte: new Date() } },
        ],
      }).sort({ applicableFrom: -1 });

      if (gstSetting) {
        const baseAmount = req.body.amount || req.body.subtotal || 0;
        req.body.gstAmount = (baseAmount * gstSetting.gstPercentage) / 100;
        req.body.gstPercentage = gstSetting.gstPercentage;
        req.body.total = baseAmount + req.body.gstAmount;
      }
    } catch (error) {
      // GST calculation failed, continue without it
      console.log('GST auto-calculation failed:', error);
    }
  }

  const invoice = await Invoice.create(req.body);
  res.status(201).json({ success: true, data: invoice });
});

export const updateInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }

  res.status(200).json({ success: true, data: invoice });
});

// Payment Entries
export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.invoiceId) query.invoiceId = req.query.invoiceId;

  const payments = await PaymentEntry.find(query)
    .populate('invoiceId')
    .populate('receivedBy', 'name email')
    .sort('-receivedAt');

  res.status(200).json({ success: true, count: payments.length, data: payments });
});

export const createPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.receivedBy = req.user._id;

  const payment = await PaymentEntry.create(req.body);

  // Update invoice status
  const invoice = await Invoice.findById(req.body.invoiceId);
  if (invoice) {
    const totalPaid = await PaymentEntry.aggregate([
      { $match: { invoiceId: invoice._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    if (totalPaid.length > 0 && totalPaid[0].total >= invoice.total) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      await invoice.save();
    }
  }

  res.status(201).json({ success: true, data: payment });
});

// Expense Claims
export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.employeeId) query.employeeId = req.query.employeeId;

  const expenses = await ExpenseClaim.find(query)
    .populate('employeeId', 'name email')
    .sort('-submittedAt');

  res.status(200).json({ success: true, count: expenses.length, data: expenses });
});

export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.employeeId = req.user._id;
  req.body.organizationId = req.user.organizationId;

  const expense = await ExpenseClaim.create(req.body);
  res.status(201).json({ success: true, data: expense });
});

export const approveExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await ExpenseClaim.findById(req.params.id);

  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense claim not found' });
    return;
  }

  expense.status = req.body.action === 'approve' ? 'approved' : 'rejected';
  expense.approvedBy = req.user._id;
  expense.approvedAt = new Date();
  expense.remarks = req.body.remarks;
  await expense.save();

  res.status(200).json({ success: true, data: expense });
});

// Targets
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.employeeId) query.employeeId = req.query.employeeId;
  if (req.query.departmentId) query.departmentId = req.query.departmentId;

  const targets = await Target.find(query)
    .populate('employeeId', 'name email')
    .populate('departmentId', 'name');

  res.status(200).json({ success: true, count: targets.length, data: targets });
});

export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const target = await Target.create(req.body);
  res.status(201).json({ success: true, data: target });
});

export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: target });
});

// Fee Structures
export const getFeeStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.programId) query.programId = req.query.programId;

  const fees = await FeeStructure.find(query).populate('programId', 'name code');
  res.status(200).json({ success: true, count: fees.length, data: fees });
});

export const createFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const fee = await FeeStructure.create(req.body);
  res.status(201).json({ success: true, data: fee });
});

export const updateFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: fee });
});


// Get single invoice
export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }

  res.status(200).json({ success: true, data: invoice });
});

// Delete invoice (with mandatory remarks for audit)
export const deleteInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;

  if (!remarks || remarks.trim().length === 0) {
    res.status(400);
    throw new Error('Deletion remarks are mandatory for audit purposes');
  }

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Create audit log
  const AuditLog = (await import('../models/AuditLog.js')).default;
  await AuditLog.create({
    organizationId: req.user.organizationId,
    userId: req.user._id,
    action: 'delete',
    resource: 'Invoice',
    resourceId: invoice._id,
    details: {
      deletedData: invoice.toObject(),
      remarks,
    },
  });

  await invoice.deleteOne();

  res.json({ 
    success: true, 
    message: 'Invoice deleted and logged for audit',
  });
});

// Approve invoice
export const approveInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { status: 'paid', paidAt: new Date() },
    { new: true }
  );

  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }

  res.status(200).json({ success: true, data: invoice });
});

// Get single payment
export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await PaymentEntry.findById(req.params.id);

  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }

  res.status(200).json({ success: true, data: payment });
});

// Update payment
export const updatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await PaymentEntry.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }

  res.status(200).json({ success: true, data: payment });
});

// Delete payment
// Delete payment (with mandatory remarks for audit)
export const deletePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;

  if (!remarks || remarks.trim().length === 0) {
    res.status(400);
    throw new Error('Deletion remarks are mandatory for audit purposes');
  }

  const payment = await PaymentEntry.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  // Create audit log
  const AuditLog = (await import('../models/AuditLog.js')).default;
  await AuditLog.create({
    organizationId: req.user.organizationId,
    userId: req.user._id,
    action: 'delete',
    resource: 'PaymentEntry',
    resourceId: payment._id,
    details: {
      deletedData: payment.toObject(),
      remarks,
    },
  });

  await payment.deleteOne();

  res.json({ 
    success: true, 
    message: 'Payment deleted and logged for audit',
  });
});

// Get single expense
export const getExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await ExpenseClaim.findById(req.params.id);

  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }

  res.status(200).json({ success: true, data: expense });
});

// Update expense
export const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await ExpenseClaim.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }

  res.status(200).json({ success: true, data: expense });
});

// Delete expense
export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await ExpenseClaim.findByIdAndDelete(req.params.id);

  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Get single target
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findById(req.params.id);

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: target });
});

// Delete target
export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findByIdAndDelete(req.params.id);

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Get all users in the sales department for finance to assign targets
export const getFinanceSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const User = (await import('../models/User.js')).default;
  const Department = (await import('../models/Department.js')).default;

  const orgId = req.user.organizationId;

  // Find sales department(s) in this org
  const salesDepts = await Department.find({
    organizationId: orgId,
    $or: [
      { name: { $regex: /sales/i } },
      { type: 'sales' },
    ],
  }).select('_id').lean();

  const salesDeptIds = salesDepts.map((d: any) => d._id);

  const users = await User.find({
    organizationId: orgId,
    $or: [
      { role: { $in: ['sales_admin', 'sales'] } },
      { departmentId: { $in: salesDeptIds } },
      { additionalDepartmentIds: { $in: salesDeptIds } },
    ],
    status: 'active',
  }).select('name email role designation status').lean();

  res.status(200).json({ success: true, count: users.length, data: users });
});

// Get single fee structure
export const getFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await FeeStructure.findById(req.params.id);

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: fee });
});

// Delete fee structure
export const deleteFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await FeeStructure.findByIdAndDelete(req.params.id);

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// ─── Study Center Onboarding — Finance ───────────────────────────────────────

import UniversityAuthFee from '../models/UniversityAuthFee.js';
import StudyCenter from '../models/StudyCenter.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const getAuthFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await UniversityAuthFee.find({ organizationId: req.user.organizationId })
    .populate('universityId', 'name code')
    .populate('configuredBy', 'name email');
  res.status(200).json({ success: true, count: fees.length, data: fees });
});

export const createAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, amount, currency } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    return;
  }

  // Upsert: one record per university per org
  const fee = await UniversityAuthFee.findOneAndUpdate(
    { organizationId: req.user.organizationId, universityId },
    { amount, currency: currency || 'INR', configuredBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  ).populate('universityId', 'name code');

  res.status(200).json({ success: true, data: fee });
});

export const updateAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, currency } = req.body;

  if (amount !== undefined && amount <= 0) {
    res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    return;
  }

  const fee = await UniversityAuthFee.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    { ...(amount && { amount }), ...(currency && { currency }), configuredBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('universityId', 'name code');

  if (!fee) {
    res.status(404).json({ success: false, message: 'Auth fee not found' });
    return;
  }

  res.status(200).json({ success: true, data: fee });
});

export const getPendingPaymentCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await StudyCenter.find({
    organizationId: req.user.organizationId,
    status: 'pending_payment',
  })
    .populate('associatedUniversityIds', 'name code')
    .populate('verifiedBy', 'name email')
    .sort('-createdAt');

  // Attach auth fee amounts
  const fees = await UniversityAuthFee.find({ organizationId: req.user.organizationId });
  const feeMap: Record<string, number> = {};
  fees.forEach(f => { feeMap[f.universityId.toString()] = f.amount; });

  const data = centers.map(c => ({
    ...c.toObject(),
    authFees: (c.associatedUniversityIds as any[]).map(u => ({
      universityId: u._id,
      universityName: u.name,
      amount: feeMap[u._id.toString()] ?? null,
    })),
  }));

  res.status(200).json({ success: true, count: data.length, data });
});

export const financeVerifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const center = await StudyCenter.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  if (center.status !== 'pending_payment') {
    res.status(400).json({ success: false, message: 'Action not permitted at current stage' });
    return;
  }

  if (action === 'approve') {
    // Ensure all associated universities have auth fees configured
    const fees = await UniversityAuthFee.find({
      organizationId: req.user.organizationId,
      universityId: { $in: center.associatedUniversityIds },
    });
    if (fees.length < center.associatedUniversityIds.length) {
      res.status(400).json({ success: false, message: 'Authorisation fee not configured for one or more universities' });
      return;
    }

    // Generate plain-text password
    const plainPassword = crypto.randomBytes(8).toString('hex');
    const username = center.code.toLowerCase();
    const loginEmail = center.email || `${username}@studycenter.local`;

    // Find the existing pending user created at registration time
    const User = (await import('../models/User.js')).default;
    let centerUser = await User.findOne({ studyCenterId: center._id });
    if (!centerUser) {
      centerUser = await User.findOne({ email: loginEmail, role: 'center_admin' });
    }

    if (centerUser) {
      // Activate the existing user (credentials already issued at registration)
      centerUser.status = 'active';
      await centerUser.save();
    } else {
      // Fallback: create user if somehow it doesn't exist
      centerUser = await User.create({
        organizationId: center.organizationId,
        name: center.name,
        email: loginEmail,
        password: plainPassword,
        role: 'center_admin',
        studyCenterId: center._id,
        status: 'active',
      });
    }

    // Store hashed credentials on center for reference
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    center.status = 'active';
    center.financeApprovedBy = req.user._id;
    center.financeApprovedAt = new Date();
    center.credentials = { username: centerUser.email, password: hashedPassword };
    center.statusHistory.push({ status: 'active', actorId: req.user._id, remarks, timestamp: new Date() });
    await center.save();

    console.log(`[StudyCenter Activated] ${center.name} | email: ${centerUser.email}`);

    res.status(200).json({
      success: true,
      data: center,
      _credentials: { email: centerUser.email },
    });
  } else if (action === 'reject') {
    if (!remarks || remarks.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Remarks are required when rejecting' });
      return;
    }
    center.status = 'rejected';
    center.paymentRemarks = remarks;
    center.statusHistory.push({ status: 'rejected', actorId: req.user._id, remarks, timestamp: new Date() });
    await center.save();
    res.status(200).json({ success: true, data: center });
  } else {
    res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject' });
  }
});

// ─── Income & Expenditure / P&L Reports ──────────────────────────────────────

import PaymentEntry from '../models/PaymentEntry.js';
import Payroll from '../models/Payroll.js';
import PayrollBatch from '../models/PayrollBatch.js';
import EnrollmentPayment from '../models/EnrollmentPayment.js';

export const getIncomeExpenditureReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  // Date range — default: current financial year (Apr–Mar)
  const now = new Date();
  const defaultFrom = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const from = req.query.from ? new Date(req.query.from as string) : defaultFrom;
  const to = req.query.to ? new Date(req.query.to as string) : defaultTo;

  // ── INCOME ──────────────────────────────────────────────────────────────────
  // 1. Paid invoices (grouped by month)
  const invoiceIncome = await Invoice.aggregate([
    { $match: { organizationId: orgId, status: 'paid', paidAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, amount: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // 2. Enrollment payments (wallet debits = center paid for enrollment)
  const enrollmentIncome = await EnrollmentPayment.aggregate([
    {
      $lookup: {
        from: 'enrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    { $match: { 'enrollment.organizationId': orgId, debitedAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$debitedAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // 3. Payment entries (manual payments received)
  const paymentEntryIncome = await PaymentEntry.aggregate([
    { $match: { organizationId: orgId, receivedAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$receivedAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // ── EXPENDITURE ─────────────────────────────────────────────────────────────
  // 1. Approved/reimbursed expense claims
  const expenseData = await ExpenseClaim.aggregate([
    { $match: { organizationId: orgId, status: { $in: ['approved', 'reimbursed'] }, approvedAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$approvedAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 }, byCategory: { $push: { category: '$category', amount: '$amount' } } } },
    { $sort: { _id: 1 } },
  ]);

  // 2. Completed payroll batches
  const payrollData = await PayrollBatch.aggregate([
    { $match: { organizationId: orgId, status: 'completed', completedAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } }, amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // ── BUILD MONTHLY TIMELINE ───────────────────────────────────────────────────
  // Collect all months present in any dataset
  const monthSet = new Set<string>();
  [...invoiceIncome, ...enrollmentIncome, ...paymentEntryIncome, ...expenseData, ...payrollData]
    .forEach(r => monthSet.add(r._id));

  // Also fill in every month in the range
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    monthSet.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const months = Array.from(monthSet).sort();

  const toMap = (arr: any[]) => Object.fromEntries(arr.map(r => [r._id, r]));
  const invMap = toMap(invoiceIncome);
  const enrMap = toMap(enrollmentIncome);
  const payMap = toMap(paymentEntryIncome);
  const expMap = toMap(expenseData);
  const salMap = toMap(payrollData);

  const monthly = months.map(m => {
    const invoiceAmt = invMap[m]?.amount || 0;
    const enrollAmt = enrMap[m]?.amount || 0;
    const payEntryAmt = payMap[m]?.amount || 0;
    const totalIncome = invoiceAmt + enrollAmt + payEntryAmt;

    const expenseAmt = expMap[m]?.amount || 0;
    const salaryAmt = salMap[m]?.amount || 0;
    const totalExpenditure = expenseAmt + salaryAmt;

    return {
      month: m,
      income: {
        invoices: invoiceAmt,
        enrollments: enrollAmt,
        payments: payEntryAmt,
        total: totalIncome,
      },
      expenditure: {
        expenses: expenseAmt,
        salaries: salaryAmt,
        total: totalExpenditure,
      },
      net: totalIncome - totalExpenditure,
    };
  });

  // ── TOTALS ───────────────────────────────────────────────────────────────────
  const totalIncome = monthly.reduce((s, m) => s + m.income.total, 0);
  const totalExpenditure = monthly.reduce((s, m) => s + m.expenditure.total, 0);
  const netProfit = totalIncome - totalExpenditure;

  // Expense category breakdown (for P&L detail)
  const categoryBreakdown = await ExpenseClaim.aggregate([
    { $match: { organizationId: orgId, status: { $in: ['approved', 'reimbursed'] }, approvedAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { amount: -1 } },
  ]);

  res.json({
    success: true,
    data: {
      period: { from, to },
      monthly,
      totals: {
        income: totalIncome,
        expenditure: totalExpenditure,
        netProfit,
        profitMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0,
      },
      incomeBreakdown: {
        invoices: invoiceIncome.reduce((s, r) => s + r.amount, 0),
        enrollments: enrollmentIncome.reduce((s, r) => s + r.amount, 0),
        payments: paymentEntryIncome.reduce((s, r) => s + r.amount, 0),
      },
      expenditureBreakdown: {
        salaries: payrollData.reduce((s, r) => s + r.amount, 0),
        expenses: expenseData.reduce((s, r) => s + r.amount, 0),
        byCategory: categoryBreakdown,
      },
    },
  });
});
