// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { filterBreakdownsForMethod } from '../utils/feeStructureHelper.js';
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
  
  let finalCenterId = centerId;
  if (!finalCenterId && studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      finalCenterId = student.centerId;
    }
  }

  if (!finalCenterId) {
    res.status(400).json({ success: false, message: 'centerId is required' });
    return;
  }

  const data: any = {
    centerId: finalCenterId,
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
  res.status(201).json({ success: true, data: { ...invoice, _id: invoice.id } });
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

  const invoice = await prisma.invoice.update({ 
    where: { id: req.params.id }, 
    data,
    include: { student: true }
  });

  // University fee payments are now generated at enrollment time for all cycles.

  res.json({ success: true, data: { ...invoice, _id: invoice.id } });
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
  const { invoiceId, amount, notes } = req.body;
  const method = req.body.method || req.body.paymentMethod;
  const referenceNo = req.body.referenceNo || req.body.transactionId;
  const rawReceivedAt = req.body.receivedAt || req.body.paymentDate;

  if (!method) {
    res.status(400).json({ success: false, message: 'Payment method is required' });
    return;
  }

  const payment = await prisma.paymentEntry.create({
    data: {
      invoiceId,
      amount: amount !== undefined ? parseFloat(amount) : 0,
      method,
      referenceNo,
      receivedAt: rawReceivedAt ? new Date(rawReceivedAt) : undefined,
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
  const expenses = await prisma.expenseClaim.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });
  const mapped = expenses.map(exp => ({
    ...exp,
    employeeId: exp.user || exp.employeeId
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await prisma.expenseClaim.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });
  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  const mapped = {
    ...expense,
    employeeId: expense.user || expense.employeeId
  };
  res.json({ success: true, data: mapped });
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
  const targets = await prisma.target.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
  const mapped = targets.map(t => ({
    ...t,
    employeeId: t.employee || t.employeeId
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findUnique({
    where: { id: req.params.id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  const mapped = {
    ...target,
    employeeId: target.employee || target.employeeId
  };
  res.json({ success: true, data: mapped });
});
export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, type, period, target, achieved, incentive, deadline } = req.body;
  const cleanEmpId = (employeeId && employeeId !== 'none' && employeeId !== 'null') ? employeeId : null;
  const cleanTarget = parseFloat(target) || 0;
  const cleanAchieved = (achieved !== undefined && achieved !== '' && !isNaN(parseFloat(achieved))) ? parseFloat(achieved) : 0;
  const cleanIncentive = (incentive !== undefined && incentive !== '' && !isNaN(parseFloat(incentive))) ? parseFloat(incentive) : null;

  const newTarget = await prisma.target.create({
    data: {
      organizationId: req.user.organizationId,
      employeeId: cleanEmpId,
      type,
      period: period || 'monthly',
      target: cleanTarget,
      achieved: cleanAchieved,
      incentive: cleanIncentive,
      deadline: deadline ? new Date(deadline) : null,
      status: cleanAchieved >= cleanTarget && cleanTarget > 0 ? 'completed' : 'pending'
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
  const mapped = {
    ...newTarget,
    employeeId: newTarget.employee || newTarget.employeeId
  };
  res.status(201).json({ success: true, data: mapped });
});
export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  const { employeeId, type, period, target, achieved, incentive, deadline, status } = req.body;
  const data: any = {};
  if (employeeId !== undefined) {
    data.employeeId = (employeeId && employeeId !== 'none' && employeeId !== 'null') ? employeeId : null;
  }
  if (type !== undefined) data.type = type;
  if (period !== undefined) data.period = period;
  if (target !== undefined) {
    const t = parseFloat(target);
    if (!isNaN(t)) data.target = t;
  }
  if (achieved !== undefined) {
    const a = parseFloat(achieved);
    if (!isNaN(a)) data.achieved = a;
  }
  if (incentive !== undefined) data.incentive = incentive !== '' && incentive !== null ? parseFloat(incentive) : null;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
  if (status !== undefined) {
    data.status = status;
  } else if (data.target !== undefined || data.achieved !== undefined) {
    const finalTarget = data.target !== undefined ? data.target : exists.target;
    const finalAchieved = data.achieved !== undefined ? data.achieved : exists.achieved;
    data.status = finalAchieved >= finalTarget && finalTarget > 0 ? 'completed' : 'pending';
  }

  const updated = await prisma.target.update({
    where: { id: req.params.id },
    data,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
  const mapped = {
    ...updated,
    employeeId: updated.employee || updated.employeeId
  };
  res.json({ success: true, data: mapped });
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
  const fees = await prisma.feeStructure.findMany({
    where: { organizationId: req.user.organizationId },
    include: { program: true }
  });
  const mapped = fees.map(f => ({
    ...f,
    programId: f.program || f.programId
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getFeeStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await prisma.feeStructure.findUnique({
    where: { id: req.params.id },
    include: { program: true }
  });
  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }
  const mapped = {
    ...fee,
    programId: fee.program || fee.programId
  };
  res.json({ success: true, data: mapped });
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
  const authFees = await prisma.universityAuthFee.findMany({
    where: { organizationId: req.user.organizationId },
    include: { university: true }
  });
  const formattedFees = authFees.map(fee => {
    const details = (fee.feeDetails as any) || {};
    return {
      id: fee.id,
      universityId: fee.university,
      amount: details.amount || 0,
      currency: details.currency || 'INR',
      updatedAt: fee.updatedAt
    };
  });
  res.json({ success: true, data: formattedFees });
});
export const createAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, amount, currency } = req.body;
  if (!universityId) {
    res.status(400).json({ success: false, message: 'University ID is required' });
    return;
  }
  const existing = await prisma.universityAuthFee.findUnique({
    where: {
      organizationId_universityId: {
        organizationId: req.user.organizationId,
        universityId
      }
    }
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'Auth fee already configured for this university' });
    return;
  }
  const authFee = await prisma.universityAuthFee.create({
    data: {
      organizationId: req.user.organizationId,
      universityId,
      feeDetails: { amount: parseFloat(amount), currency: currency || 'INR' },
      configuredBy: req.user.id
    },
    include: { university: true }
  });
  const details = authFee.feeDetails as any;
  res.status(201).json({
    success: true,
    data: {
      id: authFee.id,
      universityId: authFee.university,
      amount: details.amount || 0,
      currency: details.currency || 'INR',
      updatedAt: authFee.updatedAt
    }
  });
});
export const updateAuthFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, currency } = req.body;
  const exists = await prisma.universityAuthFee.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Auth fee configuration not found' });
    return;
  }
  const authFee = await prisma.universityAuthFee.update({
    where: { id: req.params.id },
    data: {
      feeDetails: { amount: parseFloat(amount), currency: currency || 'INR' }
    },
    include: { university: true }
  });
  const details = authFee.feeDetails as any;
  res.json({
    success: true,
    data: {
      id: authFee.id,
      universityId: authFee.university,
      amount: details.amount || 0,
      currency: details.currency || 'INR',
      updatedAt: authFee.updatedAt
    }
  });
});

// Centers
export const getPendingPaymentCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: { in: ['pending_payment', 'ops_verified'] } as any
    },
    include: {
      referrer: { select: { id: true, name: true, email: true } },
      verifier: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: centers });
});

export const financeVerifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body || {};
  const isApproved = action !== 'reject';
  const newStatus = isApproved ? 'active' : 'rejected';

  const center = await prisma.$transaction(async (tx) => {
    const sc = await tx.studyCenter.update({
      where: { id: req.params.id },
      data: {
        status: newStatus as any,
        financeApprovedBy: req.user.id,
        financeApprovedAt: new Date(),
        paymentRemarks: remarks || null
      }
    });

    if (isApproved) {
      const existingWallet = await tx.studyCenterWallet.findUnique({
        where: { centerId: sc.id }
      });
      if (!existingWallet) {
        await tx.studyCenterWallet.create({
          data: {
            centerId: sc.id,
            balance: 0,
            status: 'active'
          }
        });
      }
    }

    return sc;
  });

  res.json({ success: true, data: center });
});

export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, email, contact, referredById, ...rest } = req.body;
  
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  // Validate / generate code
  let centerCode = (code || '').trim().toUpperCase();
  if (!centerCode) {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `SC${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = await prisma.studyCenter.findFirst({
        where: { organizationId: req.user.organizationId, code: candidate }
      });
      if (!exists) {
        centerCode = candidate;
        break;
      }
      attempts++;
    }
  } else {
    const existing = await prisma.studyCenter.findFirst({
      where: { organizationId: req.user.organizationId, code: centerCode }
    });
    if (existing) {
      res.status(400).json({ success: false, message: `Center code "${centerCode}" already exists. Please choose a unique code.` });
      return;
    }
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    res.status(400).json({ success: false, message: 'A user account with this email already exists' });
    return;
  }

  const rawPassword = `Center@${Math.floor(1000 + Math.random() * 9000)}`;
  const hashedPassword = await hashPassword(rawPassword);
  const userId = await generateUserId();

  const result = await prisma.$transaction(async (tx) => {
    const center = await tx.studyCenter.create({
      data: {
        ...rest,
        name: name || 'Study Center',
        code: centerCode,
        email,
        contact: contact || 'Not Provided',
        organizationId: req.user.organizationId,
        status: 'active' as any,
        financeApprovedBy: req.user.id,
        financeApprovedAt: new Date(),
        referredBy: referredById === '__none__' || !referredById ? null : referredById,
        credentials: { userId, password: rawPassword }
      }
    });

    await tx.studyCenterWallet.create({
      data: {
        centerId: center.id,
        balance: 0,
        status: 'active'
      }
    });

    const user = await tx.user.create({
      data: {
        userId,
        organizationId: req.user.organizationId,
        studyCenterId: center.id,
        email: email || `admin.${centerCode}@example.com`,
        password: hashedPassword,
        name: `${name || 'Center'} Admin`,
        role: 'center_admin' as any,
        phone: contact || 'Not Provided',
        status: 'active' as any
      }
    });

    return { center, user, credentials: { userId, password: rawPassword } };
  });

  res.status(201).json({ success: true, data: result });
});

// Reports
export const getIncomeExpenditureReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fromDate = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear() + '-04-01');
  const toDate = req.query.to ? new Date(req.query.to as string) : new Date();

  // Set time limits to include whole days
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  // Generate list of months in date range
  const months: string[] = [];
  let current = new Date(fromDate);
  while (current <= toDate) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const key = `${yyyy}-${mm}`;
    if (!months.includes(key)) {
      months.push(key);
    }
    current.setMonth(current.getMonth() + 1);
  }

  // Initialize monthly structure
  const monthlyData = new Map<string, {
    month: string;
    income: { invoices: number; enrollments: number; payments: number; total: number };
    expenditure: { expenses: number; salaries: number; total: number };
    net: number;
  }>();

  for (const m of months) {
    monthlyData.set(m, {
      month: m,
      income: { invoices: 0, enrollments: 0, payments: 0, total: 0 },
      expenditure: { expenses: 0, salaries: 0, total: 0 },
      net: 0
    });
  }

  // 1. Fetch Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: req.user.organizationId,
      createdAt: { gte: fromDate, lte: toDate },
      status: { not: 'draft' }
    }
  });
  for (const inv of invoices) {
    const date = new Date(inv.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyData.get(key);
    if (bucket) {
      bucket.income.invoices += inv.total;
      bucket.income.total += inv.total;
    }
  }

  // 2. Fetch Enrollment Payments
  const enrollmentPayments = await prisma.enrollmentPayment.findMany({
    where: {
      studyCenter: { organizationId: req.user.organizationId },
      createdAt: { gte: fromDate, lte: toDate }
    }
  });
  for (const ep of enrollmentPayments) {
    const date = new Date(ep.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyData.get(key);
    if (bucket) {
      bucket.income.enrollments += ep.amount;
      bucket.income.total += ep.amount;
    }
  }

  // 3. Fetch Payment Entries
  const paymentEntries = await prisma.paymentEntry.findMany({
    where: {
      organizationId: req.user.organizationId,
      receivedAt: { gte: fromDate, lte: toDate }
    }
  });
  for (const pe of paymentEntries) {
    const date = new Date(pe.receivedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyData.get(key);
    if (bucket) {
      bucket.income.payments += pe.amount;
      bucket.income.total += pe.amount;
    }
  }

  // 4. Fetch Expense Claims
  const expenses = await prisma.expenseClaim.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: { in: ['approved', 'reimbursed'] },
      createdAt: { gte: fromDate, lte: toDate }
    }
  });
  for (const exp of expenses) {
    const date = new Date(exp.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyData.get(key);
    if (bucket) {
      bucket.expenditure.expenses += exp.amount;
      bucket.expenditure.total += exp.amount;
    }
  }

  // 5. Fetch Salaries
  const payrolls = await prisma.payroll.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: { in: ['paid', 'confirmed', 'transferred_to_finance'] },
      OR: [
        { paymentDate: { gte: fromDate, lte: toDate } },
        { createdAt: { gte: fromDate, lte: toDate } }
      ]
    }
  });
  for (const pay of payrolls) {
    const date = pay.paymentDate ? new Date(pay.paymentDate) : new Date(pay.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyData.get(key);
    if (bucket) {
      bucket.expenditure.salaries += pay.netSalary;
      bucket.expenditure.total += pay.netSalary;
    }
  }

  // Calculate net for each month
  for (const bucket of monthlyData.values()) {
    bucket.net = bucket.income.total - bucket.expenditure.total;
  }

  // Calculate totals and breakdowns
  const monthly = Array.from(monthlyData.values());
  let totalIncome = 0;
  let totalExpenditure = 0;
  let invoiceTotal = 0;
  let enrollmentTotal = 0;
  let paymentTotal = 0;
  let salaryTotal = 0;
  let expenseTotal = 0;

  for (const m of monthly) {
    invoiceTotal += m.income.invoices;
    enrollmentTotal += m.income.enrollments;
    paymentTotal += m.income.payments;
    salaryTotal += m.expenditure.salaries;
    expenseTotal += m.expenditure.expenses;
    totalIncome += m.income.total;
    totalExpenditure += m.expenditure.total;
  }

  const categoryMap = new Map<string, number>();
  for (const exp of expenses) {
    const cat = exp.category || 'Other';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + exp.amount);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([id, amount]) => ({
    id,
    amount,
    count: expenses.filter(e => e.category === id).length
  }));

  const netProfit = totalIncome - totalExpenditure;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  res.json({
    success: true,
    data: {
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      monthly,
      totals: {
        income: totalIncome,
        expenditure: totalExpenditure,
        netProfit,
        profitMargin
      },
      incomeBreakdown: {
        invoices: invoiceTotal,
        enrollments: enrollmentTotal,
        payments: paymentTotal
      },
      expenditureBreakdown: {
        salaries: salaryTotal,
        expenses: expenseTotal,
        byCategory
      }
    }
  });
});

// Sales Users
export const getFinanceSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      role: { in: ['sales_admin', 'bde', 'employee'] }
    }
  });
  res.json({ success: true, data: users });
});

// University Fee Payments

export const getUniversityFeePayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, universityId, centerId, programId, search } = req.query;
  const whereClause: any = { organizationId: req.user.organizationId };
  if (status && status !== 'all') {
    whereClause.status = status;
  }
  
  if (universityId || centerId || programId || search) {
    whereClause.student = { ...whereClause.student };
    
    if (universityId) {
      whereClause.student.program = { universityId: universityId as string };
    }
    if (centerId) {
      whereClause.student.centerId = centerId as string;
    }
    if (programId) {
      whereClause.student.programId = programId as string;
    }
    if (search) {
      const s = search as string;
      whereClause.student = {
        ...whereClause.student,
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { enrollmentNo: { contains: s, mode: 'insensitive' } },
          { uniEnrollmentNumber: { contains: s, mode: 'insensitive' } }
        ]
      };
    }
  }

  const payments = await prisma.universityFeePayment.findMany({
    where: whereClause,
    include: {
      student: {
        include: {
          program: true,
          center: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: payments.length, data: payments });
});


export const payUniversityFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { referenceNo, paidAt } = req.body;
  const screenshot = req.file ? `/uploads/${req.file.filename}` : undefined;

  const payment = await prisma.universityFeePayment.findUnique({
    where: { id: req.params.id }
  });

  if (!payment || payment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'University fee payment entry not found' });
    return;
  }

  const updated = await prisma.universityFeePayment.update({
    where: { id: req.params.id },
    data: {
      status: 'paid',
      referenceNo: referenceNo || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      screenshot: screenshot || payment.screenshot
    }
  });

  // After paying a semester/year installment, unlock the next one
  const semLabel = payment.semesterOrYear || '';
  const semMatch = semLabel.match(/^(Semester|Year)\s+(\d+)$/);
  if (semMatch && payment.enrollmentId) {
    const prefix = semMatch[1]; // "Semester" or "Year"
    const currentNum = parseInt(semMatch[2], 10);
    const nextNum = currentNum + 1;
    const nextLabel = `${prefix} ${nextNum}`;

    // Check if next semester already exists
    const nextExists = await prisma.universityFeePayment.findFirst({
      where: { enrollmentId: payment.enrollmentId, semesterOrYear: nextLabel }
    });

    if (nextExists) {
      if (nextExists.status === 'locked') {
        await prisma.universityFeePayment.update({
          where: { id: nextExists.id },
          data: { status: 'pending' }
        });
      }
    } else if (payment.enrollmentId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: payment.enrollmentId }
      });
      if (enrollment) {
        const { resolveProgramFeeStructure } = await import('../utils/feeStructureHelper.js');
        const feeStructure = await resolveProgramFeeStructure(
          payment.organizationId,
          enrollment.programId,
          enrollment.sessionId,
          enrollment.specialisation || null
        ).catch(() => null);

        if (feeStructure) {
          let breakdownsArray: any[] = [];
          if (typeof feeStructure.feeBreakdown === 'string') {
            try { breakdownsArray = JSON.parse(feeStructure.feeBreakdown); } catch (e) { breakdownsArray = []; }
          } else if (Array.isArray(feeStructure.feeBreakdown)) {
            breakdownsArray = feeStructure.feeBreakdown as any[];
          }

          breakdownsArray = filterBreakdownsForMethod(breakdownsArray, (enrollment as any).paymentMethod, feeStructure.billingCycle).blocks;

          // nextNum is 1-indexed; breakdown array is 0-indexed
          const nextBreakdown = breakdownsArray[nextNum - 1];
          if (nextBreakdown) {
            await prisma.universityFeePayment.create({
              data: {
                organizationId: payment.organizationId,
                studentId: payment.studentId,
                enrollmentId: payment.enrollmentId,
                semesterOrYear: nextLabel,
                amount: Number(nextBreakdown.universityFee || 0),
                status: 'pending'
              }
            });
          }
        }
      }
    }
  }

  res.json({ success: true, data: updated });
});


// ─── Total Data Report ─────────────────────────────────────────────────────────

export const getTotalReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, programId, sessionId, search, dateFrom, dateTo } = req.query as Record<string, string>;

  // Fetch fee structures first so we can build university→programId mapping
  const feeStructures = await prisma.programFeeStructure.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      program: { select: { id: true, name: true } },
      university: { select: { id: true, name: true, coordinatorName: true } },
      admissionSession: { select: { id: true, name: true } },
    },
  });

  let programIdsForUniversity: string[] | undefined;
  if (universityId) {
    const progs = await prisma.program.findMany({ where: { universityId }, select: { id: true } });
    programIdsForUniversity = progs.map(p => p.id);
    if (programIdsForUniversity.length === 0) {
      res.json({ success: true, count: 0, data: [] });
      return;
    }
  }

  // Build final programId filter: if both universityId AND programId filters active,
  // use the intersection; otherwise use whichever is set
  let programIdFilter: { programId: string } | { programId: { in: string[] } } | undefined;
  if (programId && programIdsForUniversity) {
    // Both filters — intersection
    if (!programIdsForUniversity.includes(programId)) {
      res.json({ success: true, count: 0, data: [] });
      return;
    }
    programIdFilter = { programId };
  } else if (programId) {
    programIdFilter = { programId };
  } else if (programIdsForUniversity) {
    programIdFilter = { programId: { in: programIdsForUniversity } };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: req.user.organizationId,
      ...programIdFilter,
      ...(sessionId && { sessionId }),
      ...( (() => {
        const dateFilter: any = {};
        if (dateFrom && !isNaN(new Date(dateFrom).getTime())) {
          dateFilter.gte = new Date(dateFrom);
        }
        if (dateTo && !isNaN(new Date(dateTo + 'T23:59:59.999Z').getTime())) {
          dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z');
        }
        return Object.keys(dateFilter).length > 0 ? {
          OR: [
            { admissionDate: dateFilter },
            { admissionDate: null, createdAt: dateFilter }
          ]
        } : {};
      })() ),
      ...(search && {
        OR: [
          { studentName: { contains: search, mode: 'insensitive' } },
          { studyCenter: { name: { contains: search, mode: 'insensitive' } } },
        ]
      }),
    },
    include: {
      program: { select: { id: true, name: true, university: { select: { name: true, coordinatorName: true } } } },
      session: { select: { id: true, name: true } },
      studyCenter: { select: { id: true, name: true, branchName: true, coordinatorName: true } },
      payment: true,
      commissionIn: {
        include: {
          commissionOuts: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch university fee payments for enrolled students
  const studentIds = [...new Set(enrollments.map(e => e.studentId).filter(Boolean))] as string[];
  const universityPayments = studentIds.length > 0
    ? await prisma.universityFeePayment.findMany({
        where: {
          organizationId: req.user.organizationId,
          studentId: { in: studentIds },
        },
      })
    : [];

  const uniPaymentMap: Record<string, any[]> = {};
  for (const up of universityPayments) {
    let eId = up.enrollmentId;
    if (!eId && up.studentId) {
      const e = enrollments.find(e => e.studentId === up.studentId);
      if (e) eId = e.id;
    }
    if (eId) {
      uniPaymentMap[eId] = uniPaymentMap[eId] || [];
      uniPaymentMap[eId].push(up);
    }
  }

  // Fetch Re-Registration Invoices
  const invoices = studentIds.length > 0
    ? await prisma.invoice.findMany({
        where: {
          organizationId: req.user.organizationId,
          studentId: { in: studentIds },
          status: 'paid'
        },
      })
    : [];

  const invoiceMap: Record<string, any[]> = {};
  for (const inv of invoices) {
    if (inv.studentId) {
      const e = enrollments.find(e => e.studentId === inv.studentId);
      if (e) {
        invoiceMap[e.id] = invoiceMap[e.id] || [];
        invoiceMap[e.id].push(inv);
      }
    }
  }

  const rows = enrollments.map(enrollment => {
    const payment = enrollment.payment;
    const uniPayments = uniPaymentMap[enrollment.id] || [];
    const studentInvoices = invoiceMap[enrollment.id] || [];
    const reRegPaidAmount = studentInvoices.reduce((sum, i) => sum + i.amount, 0);

    const totalUniAmount = uniPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidUniAmount = uniPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    let uniStatus = 'Pending';
    if (uniPayments.length > 0) {
      if (uniPayments.every(p => p.status === 'paid')) uniStatus = 'Paid';
      else if (uniPayments.some(p => p.status === 'paid')) uniStatus = 'Partially Paid';
    } else {
      uniStatus = 'pending';
    }

    // Find best-matching fee structure (session-specific first, then program-only)
    const feeStruct =
      feeStructures.find(f => f.programId === enrollment.programId && f.admissionSessionId === enrollment.sessionId) ||
      feeStructures.find(f => f.programId === enrollment.programId && !f.admissionSessionId);

    const additionalFees: any[] = Array.isArray(feeStruct?.additionalFees) ? feeStruct.additionalFees : [];
    const coordinatorFee = additionalFees.find((f: any) => {
      const label = typeof f?.label === 'string' ? f.label.toLowerCase() : '';
      const type = typeof f?.type === 'string' ? f.type.toLowerCase() : '';
      return label.includes('coordinator') || type.includes('coordinator');
    });

    const commInList = enrollment.commissionIn || [];
    const commOutList = commInList.flatMap(c => c.commissionOuts || []);

      let centerPaymentAmount = enrollment.totalFee !== null ? enrollment.totalFee : (payment?.amount ?? null);
      let centerPaymentStatus = payment ? 'Paid' : 'Due';
      
      if (!payment && enrollment.paymentType === 'direct_to_university') {
        centerPaymentAmount = enrollment.totalFee !== null ? enrollment.totalFee : 0;
        centerPaymentStatus = 'Paid';
      }

      return {
        id: enrollment.id,
        studentName: enrollment.studentName,
        enrollmentNumber: enrollment.enrollmentNumber,
        uniEnrollmentNumber: enrollment.uniEnrollmentNumber,
        admissionDate: enrollment.admissionDate || enrollment.createdAt,
        admissionSession: enrollment.session?.name || '',
        centerName: enrollment.studyCenter?.name || '',
        subCenterName: enrollment.studyCenter?.branchName || '',
        program: enrollment.program?.name || '',
        university: (feeStruct?.university?.name || (enrollment.program as any)?.university?.name) || '',
        centerPaymentAmount,
        centerPaymentStatus,
        centerPaymentFor: enrollment.status || '',
      universityPaymentAmount: uniPayments.length > 0 ? totalUniAmount : null,
      universityPaidAmount: uniPayments.length > 0 ? paidUniAmount : 0,
      universityPaymentStatus: uniStatus,
      universityPaymentScreenshots: uniPayments.map(p => p.screenshot).filter(Boolean),
      coordinatorName: enrollment.studyCenter?.coordinatorName || feeStruct?.university?.coordinatorName || (enrollment.program as any)?.university?.coordinatorName || coordinatorFee?.coordinator || null,
      coordinatorPaymentAmount: coordinatorFee?.amount || null,
      coordinatorPaymentStatus: coordinatorFee
        ? (uniStatus === 'Paid' ? 'paid' : 'Due')
        : 'Not Applicable',
      enrollmentStatus: enrollment.status,
      reRegTotalCollected: reRegPaidAmount,
      // Commission Got from University details
      // Commission Got from University details
      commissionInAmount: commInList.length > 0 ? commInList.reduce((sum: number, c: any) => sum + (c.receivedAmount || 0), 0) : null,
      commissionInExpected: commInList.length > 0 ? commInList.reduce((sum: number, c: any) => sum + (c.expectedAmount || 0), 0) : null,
      commissionInStatus: commInList.length > 0 ? (commInList.every((c: any) => c.status === 'received') ? 'received' : 'pending') : 'pending',
      commissionInDate: commInList.length > 0 ? (commInList.filter((c: any) => c.receivedAt).sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0]?.receivedAt || null) : null,
      // Commission Given to Centers details
      commissionOutAmount: commOutList.length > 0 ? commOutList.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) : null,
      commissionOutStatus: commOutList.length > 0 ? (commOutList.every((c: any) => c.status === 'paid') ? 'paid' : 'pending') : 'pending',
      commissionOutDate: commOutList.length > 0 ? (commOutList.filter((c: any) => c.paidAt).sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0]?.paidAt || null) : null,
    };
  });

  res.json({ success: true, count: rows.length, data: rows });
});

// ─── Re-Reg Pending Report ────────────────────────────────────────────────────
export const getReregPendingReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerId, universityId, programId, search, dueDate } = req.query as any;
  const orgId = req.user.organizationId;
  
  let actualCenterId = centerId;
  if (req.user.role === 'center_admin') {
    actualCenterId = (req.user as any).studyCenterId || (req.user as any).centerId;
  }

  // Build program filter
  let programFilter: any = {};
  if (programId) programFilter.programId = programId;
  if (universityId) {
    // Filter via program's university
    const progIds = (await prisma.program.findMany({
      where: { organizationId: orgId, universityId },
      select: { id: true },
    })).map(p => p.id);
    programFilter.programId = programId ? (progIds.includes(programId) ? programId : '__none__') : { in: progIds };
  }

  // Find all enrollments matching filters
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      ...(actualCenterId && { studyCenterId: actualCenterId }),
      ...programFilter,
      ...(search && {
        OR: [
          { studentName: { contains: search, mode: 'insensitive' } },
          { studentEmail: { contains: search, mode: 'insensitive' } },
          { studentPhone: { contains: search, mode: 'insensitive' } },
          { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      program: { select: { id: true, name: true, duration: true, university: { select: { id: true, name: true } } } },
      session: { select: { id: true, name: true } },
      studyCenter: { select: { id: true, name: true, branchName: true } },
      student: { select: { id: true, createdAt: true, enrolledAt: true, invoices: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Pre-fetch all fee structures for this organization to avoid N+1 queries
  const feeStructures = await prisma.programFeeStructure.findMany({
    where: { organizationId: orgId }
  });

  const rows: any[] = [];

  for (const e of enrollments) {
    if (!e.student) continue;

    const sessionId = e.sessionId || null;
    
    // Find candidate fee structures
    const candidates = feeStructures.filter((c: any) => 
      (c.programId === e.programId) ||
      (c.level === 'university' && c.universityId === (e.program as any).university?.id)
    );

    // Rank candidate fee structures
    const sorted = candidates.map(c => {
      let score = 0;
      if (c.level === 'program' && c.programId === e.programId) {
        if (c.admissionSessionId === sessionId) score = 100;
        else if (c.admissionSessionId === null) score = 80;
        else score = 60;
      } else if (c.level === 'university' && c.universityId === (e.program as any).university?.id) {
        if (c.admissionSessionId === sessionId) score = 40;
        else if (c.admissionSessionId === null) score = 20;
        else score = 10;
      }
      return { c, score };
    }).sort((a, b) => b.score - a.score);

    const feeStructure = sorted[0]?.c;
    if (!feeStructure) continue;

    let breakdownArray: any[] = [];
    if (feeStructure.feeBreakdown) {
      if (typeof feeStructure.feeBreakdown === 'string') {
        try { breakdownArray = JSON.parse(feeStructure.feeBreakdown); } catch (err) {}
      } else if (Array.isArray(feeStructure.feeBreakdown)) {
        breakdownArray = feeStructure.feeBreakdown;
      }
    }

    if ((e as any).paymentMethod === 'full_payment' || (e as any).paymentType === 'full_payment') continue;

    const filtered = filterBreakdownsForMethod(breakdownArray, (e as any).paymentMethod, feeStructure.billingCycle);
    breakdownArray = filtered.blocks;
    if (breakdownArray.length === 0) continue;

    const cycleLabel = filtered.label;

    const invoices = e.student.invoices || [];

    let nextUnpaidDate: Date | null = null;
    let nextUnpaidName = '';

    // Find the next UNPAID installment, starting from the 2nd installment (i = 1)
    // The 1st installment (i = 0) is paid during initial enrollment, so it is not a "Re-Registration".
    for (let i = 1; i < breakdownArray.length; i++) {
      const b = breakdownArray[i];
      const name = `${cycleLabel} ${b.year || i + 1}`;
      
      const isPaid = invoices.some((inv: any) => {
        const items = Array.isArray(inv.items) ? inv.items : JSON.parse(typeof inv.items === 'string' ? inv.items : '[]');
        return inv.status === 'paid' && items.some((item: any) => item.description?.toLowerCase().includes(name.toLowerCase()));
      });

      if (!isPaid) {
        // This is the next unpaid installment (i > 0)
        nextUnpaidName = name;
        if (b.dueDate) {
          nextUnpaidDate = new Date(b.dueDate);
        } else {
          nextUnpaidDate = new Date(e.student.enrolledAt || e.student.createdAt);
          if (cycleLabel === 'Semester') nextUnpaidDate.setMonth(nextUnpaidDate.getMonth() + i * 6);
          else nextUnpaidDate.setFullYear(nextUnpaidDate.getFullYear() + i);
        }
        break; // Stop at the first unpaid installment
      }
    }

    if (nextUnpaidName && nextUnpaidDate) {
      if (dueDate) {
        const filterDate = new Date(dueDate);
        filterDate.setHours(23, 59, 59, 999);
        if (nextUnpaidDate > filterDate) {
          continue;
        }
      }

      const daysUntilDeadline = Math.ceil((nextUnpaidDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));


      const closingDate = nextUnpaidDate.toISOString();
      const sessionStr = e.session?.name ? `${e.session.name} - ${nextUnpaidName}` : nextUnpaidName;
      rows.push({
        id: e.id,
        studentName: e.studentName,
        studentEmail: e.studentEmail,
        studentPhone: e.studentPhone,
        enrollmentNumber: e.enrollmentNumber || '',
        program: e.program?.name || '',
        university: (e.program as any)?.university?.name || '',
        center: e.studyCenter?.name || '',
        branchName: e.studyCenter?.branchName || '',
        session: sessionStr,
        reregClosingDate: closingDate,
        reregPaymentStatus: 'Pending',
        enrollmentStatus: e.status,
        daysUntilDeadline,
      });
    }
  }

  res.json({ success: true, count: rows.length, data: rows });
});

// ─── Re-Reg Completed Report ──────────────────────────────────────────────────
export const getReregCompletedReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerId, universityId, programId, search } = req.query as any;
  const orgId = req.user.organizationId;
  
  let actualCenterId = centerId;
  if (req.user.role === 'center_admin') {
    actualCenterId = (req.user as any).studyCenterId || (req.user as any).centerId;
  }

  // Build program filter
  let programFilter: any = {};
  if (programId) programFilter.programId = programId;
  if (universityId) {
    const progIds = (await prisma.program.findMany({
      where: { organizationId: orgId, universityId },
      select: { id: true },
    })).map(p => p.id);
    programFilter.programId = programId ? (progIds.includes(programId) ? programId : '__none__') : { in: progIds };
  }

  // Find all enrollments matching filters
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      ...(actualCenterId && { studyCenterId: actualCenterId }),
      ...programFilter,
      ...(search && {
        OR: [
          { studentName: { contains: search, mode: 'insensitive' } },
          { studentEmail: { contains: search, mode: 'insensitive' } },
          { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        ]
      })
    },
    include: {
      program: {
        select: { id: true, name: true, duration: true, university: { select: { id: true, name: true } } }
      },
      session: { select: { id: true, name: true } },
      studyCenter: { select: { id: true, name: true, branchName: true } },
      student: { 
        select: { 
          id: true, createdAt: true, enrolledAt: true, status: true, email: true, name: true,
          invoices: {
            where: { status: 'paid' }
          }
        } 
      },
    }
  });

  const rows: any[] = [];
  
  for (const e of enrollments) {
    if (!e.student || !e.student.invoices || e.student.invoices.length === 0) continue;

    const invoices = e.student.invoices;

    for (const inv of invoices) {
      let items: any[] = [];
      if (typeof inv.items === 'string') {
        try { items = JSON.parse(inv.items); } catch(err) {}
      } else if (Array.isArray(inv.items)) {
        items = inv.items;
      }

      // Find items that represent a re-registration payment
      // e.g., "Semester 2", "Year 2", etc. (excluding Semester 1/Year 1)
      const reregItems = items.filter(item => {
        const desc = (item.description || '').toLowerCase();
        return (desc.includes('semester') || desc.includes('year')) && 
               !desc.includes('semester 1') && !desc.includes('year 1');
      });

      if (reregItems.length > 0) {
        for (const item of reregItems) {
          // Try to extract just the "Semester X" or "Year X" part
          const match = item.description?.match(/(Semester|Year)\s+\d+/i);
          const installmentName = match ? match[0] : item.description;

          rows.push({
            id: `${e.id}-${inv.id}-${item.id || Math.random()}`,
            studentName: e.studentName,
            studentEmail: e.studentEmail,
            studentPhone: e.studentPhone,
            enrollmentNumber: e.enrollmentNumber || '',
            program: e.program?.name || '',
            university: (e.program as any)?.university?.name || '',
            center: e.studyCenter?.name || '',
            branchName: e.studyCenter?.branchName || '',
            session: e.session?.name || '',
            completedInstallment: installmentName,
            paidDate: inv.createdAt,
            amountPaid: item.amount || inv.amount,
            invoiceId: inv.id
          });
        }
      }
    }
  }

  // Sort rows by paidDate descending (newest first)
  rows.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());

  res.json({ success: true, count: rows.length, data: rows });
});

export const getUniversityWalletLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId } = req.params;
  const ledger = await prisma.universityWalletLedger.findMany({
    where: { organizationId: req.user.organizationId, universityId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: ledger });
});

export const addUniversityWalletTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId } = req.params;
  const { type, amount, transactionId, remarks, date } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const lastTransaction = await tx.universityWalletLedger.findFirst({
      where: { organizationId: req.user.organizationId, universityId },
      orderBy: { createdAt: 'desc' }
    });

    let runningBalance = lastTransaction?.runningBalance || 0;
    if (type === 'credit') runningBalance += Number(amount);
    else if (type === 'debit') runningBalance -= Number(amount);

    return await tx.universityWalletLedger.create({
      data: {
        organizationId: req.user.organizationId,
        universityId,
        type,
        amount: Number(amount),
        transactionId,
        remarks,
        date: date ? new Date(date) : new Date(),
        runningBalance
      }
    });
  });

  res.json({ success: true, data: result });
});

// ─── Sales Users Financial Performance Report (individual sales user breakdown) ───
export const getFinanceSalesUsersReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { year, month, staffId, search, status, dateFrom, dateTo } = req.query as Record<string, string>;

  // 1. Fetch sales staff
  const salesUsers = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      status: { not: 'deleted' },
      OR: [
        { role: { in: ['sales_admin', 'bde', 'counselor', 'sales_sub_admin', 'sales_manager', 'sales'] } },
        { department: { name: { contains: 'Sales', mode: 'insensitive' } } },
        { department: { name: { contains: 'Business', mode: 'insensitive' } } },
      ],
      ...(staffId && staffId !== 'all' ? { id: staffId } : {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      designation: true,
      status: true,
      createdAt: true,
      branch: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } }
    },
    orderBy: { name: 'asc' }
  });

  // Fallback: If filtered by specific staffId and not found by standard sales role/dept, look up directly
  if (staffId && staffId !== 'all' && salesUsers.length === 0) {
    const singleUser = await prisma.user.findFirst({
      where: {
        id: staffId,
        organizationId: orgId,
        status: { not: 'deleted' }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        status: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } }
      }
    });
    if (singleUser) {
      salesUsers.push(singleUser);
    }
  }

  // If not filtered to single staff, check for any other referrers with centers or enrollments
  if (!staffId || staffId === 'all') {
    const [centerReferrers, enrollmentSalesUsers] = await Promise.all([
      prisma.studyCenter.findMany({
        where: { organizationId: orgId, referredBy: { not: null } },
        select: { referredBy: true },
        distinct: ['referredBy']
      }),
      prisma.enrollment.findMany({
        where: { organizationId: orgId, salesUserId: { not: null } },
        select: { salesUserId: true },
        distinct: ['salesUserId']
      })
    ]);

    const existingIds = new Set(salesUsers.map(u => u.id));
    const extraUserIds = [
      ...centerReferrers.map(c => c.referredBy).filter(Boolean),
      ...enrollmentSalesUsers.map(e => e.salesUserId).filter(Boolean)
    ].filter(id => !existingIds.has(id as string)) as string[];

    if (extraUserIds.length > 0) {
      const extraUsers = await prisma.user.findMany({
        where: {
          id: { in: extraUserIds },
          organizationId: orgId,
          status: { not: 'deleted' }
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
          status: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } }
        }
      });
      salesUsers.push(...extraUsers);
    }
  }

  const allSalesUserIds = salesUsers.map(u => u.id);

  // 2. Fetch all study centers referred by these sales users
  const allCenters = await prisma.studyCenter.findMany({
    where: {
      organizationId: orgId,
      referredBy: { in: allSalesUserIds }
    },
    include: {
      wallet: { select: { balance: true } },
      _count: { select: { enrollments: true, students: true } }
    }
  });

  const centersByUserId: Record<string, any[]> = {};
  for (const c of allCenters) {
    if (c.referredBy) {
      if (!centersByUserId[c.referredBy]) centersByUserId[c.referredBy] = [];
      centersByUserId[c.referredBy].push({
        id: c.id,
        name: c.name,
        code: c.code,
        city: c.city,
        state: c.state,
        status: c.status,
        coordinatorName: c.coordinatorName,
        contact: c.contact,
        walletBalance: c.wallet?.balance || 0,
        enrollmentCount: c._count?.enrollments || 0,
        studentCount: c._count?.students || 0,
        createdAt: c.createdAt
      });
    }
  }

  // 3. Build date filter
  let dateFilter: any = null;
  if (dateFrom || dateTo) {
    dateFilter = {};
    if (dateFrom && !isNaN(new Date(dateFrom).getTime())) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo && !isNaN(new Date(dateTo + 'T23:59:59.999Z').getTime())) {
      dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z');
    }
  } else if (year && year !== 'all') {
    const yr = parseInt(year);
    if (!isNaN(yr)) {
      if (month && month !== 'all') {
        const mo = parseInt(month) - 1;
        const start = new Date(yr, mo, 1, 0, 0, 0);
        const end = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
        dateFilter = { gte: start, lte: end };
      } else {
        const start = new Date(yr, 0, 1, 0, 0, 0);
        const end = new Date(yr, 11, 31, 23, 59, 59, 999);
        dateFilter = { gte: start, lte: end };
      }
    }
  }

  // 4. Fetch Enrollments
  const allCenterIds = allCenters.map(c => c.id);
  const enrollmentWhere: any = {
    organizationId: orgId,
    OR: [
      { salesUserId: { in: allSalesUserIds } },
      ...(allCenterIds.length > 0 ? [{ studyCenterId: { in: allCenterIds } }] : []),
      { student: { referredBy: { in: allSalesUserIds } } }
    ]
  };

  if (dateFilter) {
    enrollmentWhere.AND = [
      {
        OR: [
          { admissionDate: dateFilter },
          { admissionDate: null, createdAt: dateFilter }
        ]
      }
    ];
  }

  if (status && status !== 'all') {
    if (status === 'enrolled') {
      enrollmentWhere.status = 'enrolled';
    } else if (status === 'pending') {
      enrollmentWhere.status = { contains: 'pending' };
    } else if (status === 'rejected') {
      enrollmentWhere.status = 'rejected';
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true } }
        }
      },
      session: { select: { id: true, name: true } },
      studyCenter: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          referredBy: true
        }
      },
      student: {
        select: {
          id: true,
          name: true,
          enrollmentNo: true,
          referredBy: true
        }
      },
      salesUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      payment: true,
      studentFeeReceipts: true,
      commissionIn: {
        include: {
          commissionOuts: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 5. Fetch targets
  const targets = await prisma.target.findMany({
    where: {
      organizationId: orgId,
      employeeId: { in: allSalesUserIds }
    }
  });

  const targetsByUserId: Record<string, any[]> = {};
  for (const t of targets) {
    if (t.employeeId) {
      if (!targetsByUserId[t.employeeId]) targetsByUserId[t.employeeId] = [];
      targetsByUserId[t.employeeId].push(t);
    }
  }

  // Map enrollments to sales users
  const enrollmentsByUserId: Record<string, any[]> = {};
  for (const e of enrollments) {
    const repId = e.salesUserId || e.studyCenter?.referredBy || e.student?.referredBy;
    if (repId) {
      if (!enrollmentsByUserId[repId]) enrollmentsByUserId[repId] = [];
      enrollmentsByUserId[repId].push(e);
    }
  }

  // 6. Aggregate data for each sales user
  const salesUsersData = salesUsers.map(user => {
    const userCenters = centersByUserId[user.id] || [];
    const userEnrollments = enrollmentsByUserId[user.id] || [];
    const userTargets = targetsByUserId[user.id] || [];

    const totalAdmissions = userEnrollments.length;
    const enrolledCount = userEnrollments.filter(e => e.status === 'enrolled').length;
    const pendingCount = userEnrollments.filter(e => typeof e.status === 'string' && e.status.includes('pending')).length;
    const rejectedCount = userEnrollments.filter(e => e.status === 'rejected').length;
    const conversionRate = totalAdmissions > 0 ? Number(((enrolledCount / totalAdmissions) * 100).toFixed(1)) : 0;

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalCommissionInExpected = 0;
    let totalCommissionInReceived = 0;
    let totalCommissionOut = 0;

    const formattedAdmissions = userEnrollments.map(e => {
      const fee = Number(e.totalFee || 0);
      const debited = Number(e.payment?.amount || 0);
      const receiptsTotal = (e.studentFeeReceipts || []).reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);
      const collected = debited > 0 ? debited : receiptsTotal > 0 ? receiptsTotal : (e.status === 'enrolled' ? fee : 0);
      const pending = Math.max(0, fee - collected);

      totalRevenue += fee;
      totalCollected += collected;

      let admCommExpected = 0;
      let admCommReceived = 0;
      const cinList = Array.isArray(e.commissionIn) ? e.commissionIn : (e.commissionIn ? [e.commissionIn] : []);
      for (const cin of cinList) {
        const exp = Number(cin.expectedAmount || 0);
        const rec = Number(cin.receivedAmount || 0);
        admCommExpected += exp;
        admCommReceived += rec;
        totalCommissionInExpected += exp;
        totalCommissionInReceived += rec;
        if (Array.isArray(cin.commissionOuts)) {
          for (const cout of cin.commissionOuts) {
            totalCommissionOut += Number(cout.amount || 0);
          }
        }
      }

      return {
        id: e.id,
        enrollmentNumber: e.enrollmentNumber || e.student?.enrollmentNo || '-',
        studentName: e.studentName || e.student?.name || '-',
        studentEmail: e.studentEmail || '-',
        studentPhone: e.studentPhone || '-',
        programName: e.program?.name || '-',
        programCode: e.program?.code || '-',
        universityName: e.program?.university?.name || '-',
        sessionName: e.session?.name || '-',
        studyCenterName: e.studyCenter?.name || '-',
        studyCenterCode: e.studyCenter?.code || '-',
        studyCenterCity: e.studyCenter?.city || '-',
        admissionDate: e.admissionDate || e.createdAt,
        status: e.status,
        totalFee: fee,
        collectedAmount: collected,
        pendingAmount: pending,
        paymentStatus: collected >= fee && fee > 0 ? 'paid' : collected > 0 ? 'partial' : 'pending',
        paymentMethod: e.paymentMethod,
        paymentType: e.paymentType,
        commissionExpected: admCommExpected,
        commissionReceived: admCommReceived
      };
    });

    const totalPendingFee = Math.max(0, totalRevenue - totalCollected);
    const netMargin = Math.max(0, totalCollected - totalCommissionOut);
    const totalCentersWalletBalance = userCenters.reduce((sum: number, c: any) => sum + Number(c.walletBalance || 0), 0);

    // Calculate 12-month trend scoped to selected or current year
    const targetTrendYear = (year && year !== 'all' && !isNaN(parseInt(year)))
      ? parseInt(year)
      : new Date().getFullYear();

    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthAdmissions = userEnrollments.filter(e => {
        const d = e.admissionDate ? new Date(e.admissionDate) : new Date(e.createdAt);
        return !isNaN(d.getTime()) && d.getFullYear() === targetTrendYear && d.getMonth() === i;
      });
      const monthRevenue = monthAdmissions.reduce((sum: number, e: any) => sum + Number(e.totalFee || 0), 0);
      const monthCollected = monthAdmissions.reduce((sum: number, e: any) => {
        const fee = Number(e.totalFee || 0);
        const debited = Number(e.payment?.amount || 0);
        const receipts = (e.studentFeeReceipts || []).reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);
        return sum + (debited > 0 ? debited : receipts > 0 ? receipts : (e.status === 'enrolled' ? fee : 0));
      }, 0);

      return {
        month: monthNum,
        admissions: monthAdmissions.length,
        enrolled: monthAdmissions.filter(e => e.status === 'enrolled').length,
        revenue: monthRevenue,
        collected: monthCollected
      };
    });

    // Targets breakdown
    const revenueTargetObj = userTargets.find((t: any) => t.type === 'revenue');
    const studentsTargetObj = userTargets.find((t: any) => t.type === 'students');
    const centersTargetObj = userTargets.find((t: any) => t.type === 'centers');

    const revTargetVal = revenueTargetObj ? Number(revenueTargetObj.target ?? revenueTargetObj.targetAmount ?? 0) : 0;
    const stuTargetVal = studentsTargetObj ? Number(studentsTargetObj.target ?? studentsTargetObj.targetAmount ?? 0) : 0;
    const cenTargetVal = centersTargetObj ? Number(centersTargetObj.target ?? centersTargetObj.targetAmount ?? 0) : 0;

    const targetStats = {
      revenueTarget: revTargetVal,
      revenueAchieved: totalRevenue,
      revenueProgress: revTargetVal > 0
        ? Number(((totalRevenue / revTargetVal) * 100).toFixed(1))
        : 0,
      studentsTarget: stuTargetVal,
      studentsAchieved: totalAdmissions,
      studentsProgress: stuTargetVal > 0
        ? Number(((totalAdmissions / stuTargetVal) * 100).toFixed(1))
        : 0,
      centersTarget: cenTargetVal,
      centersAchieved: userCenters.length,
      centersProgress: cenTargetVal > 0
        ? Number(((userCenters.length / cenTargetVal) * 100).toFixed(1))
        : 0
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        designation: user.designation,
        status: user.status,
        branchName: user.branch?.name || '-',
        departmentName: user.department?.name || '-',
        createdAt: user.createdAt
      },
      stats: {
        totalAdmissions,
        enrolledCount,
        pendingCount,
        rejectedCount,
        conversionRate,
        studyCentersCount: userCenters.length,
        totalCentersWalletBalance,
        totalRevenue,
        totalCollected,
        totalPendingFee,
        totalCommissionInExpected,
        totalCommissionInReceived,
        totalCommissionOut,
        netMargin
      },
      targetStats,
      monthlyTrend,
      centers: userCenters,
      admissions: formattedAdmissions
    };
  });

  // Filter by search query if present
  let filteredUsers = salesUsersData;
  if (search && search.trim() !== '') {
    const q = search.toLowerCase();
    filteredUsers = salesUsersData.filter(item => {
      const uMatch = item.user.name?.toLowerCase().includes(q) || item.user.email?.toLowerCase().includes(q);
      const cMatch = item.centers.some((c: any) => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q));
      const aMatch = item.admissions.some((a: any) => a.studentName?.toLowerCase().includes(q) || a.enrollmentNumber?.toLowerCase().includes(q));
      return uMatch || cMatch || aMatch;
    });
  }

  // 7. Overall Summary
  const summary = {
    totalSalesUsers: filteredUsers.length,
    totalCentersOnboarded: filteredUsers.reduce((s, u) => s + u.stats.studyCentersCount, 0),
    totalAdmissions: filteredUsers.reduce((s, u) => s + u.stats.totalAdmissions, 0),
    totalEnrolled: filteredUsers.reduce((s, u) => s + u.stats.enrolledCount, 0),
    totalPending: filteredUsers.reduce((s, u) => s + u.stats.pendingCount, 0),
    totalRejected: filteredUsers.reduce((s, u) => s + u.stats.rejectedCount, 0),
    totalRevenue: filteredUsers.reduce((s, u) => s + u.stats.totalRevenue, 0),
    totalCollected: filteredUsers.reduce((s, u) => s + u.stats.totalCollected, 0),
    totalPendingFee: filteredUsers.reduce((s, u) => s + u.stats.totalPendingFee, 0),
    totalCommissionInExpected: filteredUsers.reduce((s, u) => s + u.stats.totalCommissionInExpected, 0),
    totalCommissionInReceived: filteredUsers.reduce((s, u) => s + u.stats.totalCommissionInReceived, 0),
    totalCommissionOut: filteredUsers.reduce((s, u) => s + u.stats.totalCommissionOut, 0),
    totalNetMargin: filteredUsers.reduce((s, u) => s + u.stats.netMargin, 0),
    avgConversionRate: filteredUsers.length > 0
      ? Number((filteredUsers.reduce((s, u) => s + u.stats.conversionRate, 0) / filteredUsers.length).toFixed(1))
      : 0
  };

  // Calculate available years from enrollments
  const currentYear = new Date().getFullYear();
  const yearSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
  for (const e of enrollments) {
    const d = e.admissionDate ? new Date(e.admissionDate) : new Date(e.createdAt);
    if (!isNaN(d.getFullYear())) yearSet.add(d.getFullYear());
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const allSalesStaff = salesUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    designation: u.designation,
    departmentName: u.department?.name || '-'
  }));

  res.json({
    success: true,
    data: {
      summary,
      salesUsers: filteredUsers,
      allSalesStaff,
      availableYears,
      filters: { year, month, staffId, status, search, dateFrom, dateTo }
    }
  });
});

