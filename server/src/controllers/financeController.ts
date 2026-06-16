// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';

// Invoices
export const getInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: req.user.organizationId },
    include: { center: { select: { name: true } }, student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: invoices.length, data: invoices });
});
export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  res.json({ success: true, data: invoice });
});
export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerId, studentId, invoiceNo, amount, tax, total, status, items, dueDate } = req.body;
  const data: any = {
    centerId,
    studentId,
    invoiceNo,
    amount: amount !== undefined ? parseFloat(amount) : 0,
    tax: tax !== undefined ? parseFloat(tax) : 0,
    total: total !== undefined ? parseFloat(total) : 0,
    status: status || 'draft',
    items: items || [],
    organizationId: req.user.organizationId
  };
  if (dueDate) data.dueDate = new Date(dueDate);

  const invoice = await prisma.invoice.create({ data });
  res.status(201).json({ success: true, data: invoice });
});
export const updateInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  const { centerId, studentId, invoiceNo, amount, tax, total, status, items, dueDate, paidAt } = req.body;
  const data: any = {};
  if (centerId !== undefined) data.centerId = centerId;
  if (studentId !== undefined) data.studentId = studentId;
  if (invoiceNo !== undefined) data.invoiceNo = invoiceNo;
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (tax !== undefined) data.tax = parseFloat(tax);
  if (total !== undefined) data.total = parseFloat(total);
  if (status !== undefined) data.status = status;
  if (items !== undefined) data.items = items;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null;

  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: invoice });
});
export const deleteInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Invoice not found' });
    return;
  }
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'approved' as any } });
  res.json({ success: true, data: invoice });
});

// Payments
export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payments = await prisma.paymentEntry.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: payments.length, data: payments });
});
export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await prisma.paymentEntry.findUnique({ where: { id: req.params.id } });
  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  res.json({ success: true, data: payment });
});
export const createPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invoiceId, amount, method, referenceNo, receivedAt, notes } = req.body;
  const payment = await prisma.paymentEntry.create({
    data: {
      invoiceId,
      amount: amount !== undefined ? parseFloat(amount) : 0,
      method,
      referenceNo,
      receivedAt: receivedAt ? new Date(receivedAt) : undefined,
      notes,
      organizationId: req.user.organizationId,
      receivedBy: req.user.id
    }
  });
  res.status(201).json({ success: true, data: payment });
});
export const updatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.paymentEntry.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  const { invoiceId, amount, method, referenceNo, receivedAt, notes } = req.body;
  const data: any = {};
  if (invoiceId !== undefined) data.invoiceId = invoiceId;
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (method !== undefined) data.method = method;
  if (referenceNo !== undefined) data.referenceNo = referenceNo;
  if (receivedAt !== undefined) data.receivedAt = new Date(receivedAt);
  if (notes !== undefined) data.notes = notes;

  const payment = await prisma.paymentEntry.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: payment });
});
export const deletePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.paymentEntry.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }
  await prisma.paymentEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Expenses
export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expenses = await prisma.expenseClaim.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: expenses.length, data: expenses });
});
export const getExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.findUnique({ where: { id: req.params.id } });
  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  res.json({ success: true, data: expense });
});
export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, category, description, receipts, status } = req.body;
  const expense = await prisma.expenseClaim.create({
    data: {
      amount: amount !== undefined ? parseFloat(amount) : 0,
      category,
      description,
      receipts: receipts || [],
      status: status || 'pending',
      organizationId: req.user.organizationId,
      employeeId: req.user.id
    }
  });
  res.status(201).json({ success: true, data: expense });
});
export const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.expenseClaim.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  const { amount, category, description, receipts, status, approvedBy, remarks } = req.body;
  const data: any = {};
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description;
  if (receipts !== undefined) data.receipts = receipts;
  if (status !== undefined) data.status = status;
  if (approvedBy !== undefined) data.approvedBy = approvedBy;
  if (remarks !== undefined) data.remarks = remarks;

  const expense = await prisma.expenseClaim.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: expense });
});
export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.expenseClaim.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  await prisma.expenseClaim.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.update({ where: { id: req.params.id }, data: { status: 'approved' as any, approvedBy: req.user.id, approvedAt: new Date() } });
  res.json({ success: true, data: expense });
});

// Targets
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targets = await prisma.target.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: targets.length, data: targets });
});
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  res.json({ success: true, data: target });
});
export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  const target = await prisma.target.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  await prisma.target.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Fee Structures
export const getFeeStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await prisma.feeStructure.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: fees.length, data: fees });
});
export const getFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  res.json({ success: true, data: fee });
});
export const createFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId, registrationFee, tuitionFee, examFee, otherCharges, gstPercentage } = req.body;
  
  const existing = await prisma.feeStructure.findUnique({ where: { programId } });
  if (existing) {
    res.status(400).json({ success: false, message: 'Fee structure already exists for this program. Please edit the existing one.' });
    return;
  }

  const fee = await prisma.feeStructure.create({
    data: {
      programId,
      registrationFee: registrationFee !== undefined ? parseFloat(registrationFee) : 0,
      tuitionFee: tuitionFee !== undefined ? parseFloat(tuitionFee) : 0,
      examFee: examFee !== undefined ? parseFloat(examFee) : 0,
      otherCharges: otherCharges || {},
      gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : 18,
      organizationId: req.user.organizationId
    }
  });
  res.status(201).json({ success: true, data: fee });
});
export const updateFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  const { registrationFee, tuitionFee, examFee, otherCharges, gstPercentage } = req.body;
  const data: any = {};
  if (registrationFee !== undefined) data.registrationFee = parseFloat(registrationFee);
  if (tuitionFee !== undefined) data.tuitionFee = parseFloat(tuitionFee);
  if (examFee !== undefined) data.examFee = parseFloat(examFee);
  if (otherCharges !== undefined) data.otherCharges = otherCharges;
  if (gstPercentage !== undefined) data.gstPercentage = parseFloat(gstPercentage);

  const fee = await prisma.feeStructure.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: fee });
});
export const deleteFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  await prisma.feeStructure.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Auth Fees
export const getAuthFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});
export const createAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
export const updateAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

// Centers
export const getPendingPaymentCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_payment' as any } });
  res.json({ success: true, data: centers });
});
export const financeVerifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active' as any, financeApprovedBy: req.user.id, financeApprovedAt: new Date() } });
  res.json({ success: true, data: center });
});

export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, email, contact, referredById, ...rest } = req.body;
  
  const center = await prisma.studyCenter.create({
    data: {
      ...rest,
      name,
      code,
      email,
      contact,
      organizationId: req.user.organizationId,
      status: 'active' as any,
      financeApprovedBy: req.user.id,
      financeApprovedAt: new Date(),
      referredBy: referredById || null
    }
  });

  const hashedPassword = await hashPassword('admin123');
  const userId = await generateUserId();

  const user = await prisma.user.create({
    data: {
      userId,
      organizationId: req.user.organizationId,
      studyCenterId: center.id,
      email: email || `admin.${code}@example.com`,
      password: hashedPassword,
      name: `${name} Admin`,
      role: 'center_admin' as any,
      phone: contact,
      status: 'active' as any
    }
  });

  res.status(201).json({ success: true, data: { center, user } });
});

// Reports
export const getIncomeExpenditureReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { totals: { income: 0, expenditure: 0, netProfit: 0 } } });
});

// Sales Users
export const getFinanceSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: 'sales_admin' as any } });
  res.json({ success: true, data: users });
});
