// @ts-nocheck
import { Response } from 'express';
import { AuthRequest, isPayrollAuthorizedUser } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/mailer.js';

function sumAllowances(allowances: any): number {
  if (!allowances) return 0;
  const parsed = typeof allowances === 'string' ? JSON.parse(allowances) : allowances;
  if (Array.isArray(parsed)) {
    return parsed.reduce((acc, a) => acc + (Number(a?.amount) || 0), 0);
  }
  if (typeof parsed === 'object') {
    return Object.values(parsed).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  }
  return 0;
}

function sumDeductions(deductions: any, professionalTax = 0, labourWelfareFund = 0, tds = 0): number {
  let total = Number(professionalTax || 0) + Number(labourWelfareFund || 0) + Number(tds || 0);
  if (!deductions) return total;
  const parsed = typeof deductions === 'string' ? JSON.parse(deductions) : deductions;
  if (Array.isArray(parsed)) {
    parsed.forEach((d: any) => {
      total += Number(d?.amount) || 0;
    });
  } else if (typeof parsed === 'object') {
    Object.entries(parsed).forEach(([k, v]: [string, any]) => {
      // Avoid double-counting TDS if tax=0 or tds is stored top-level
      if (k === 'tax' && Number(tds || 0) > 0) return;
      total += Number(v) || 0;
    });
  }
  return total;
}

export const getPayrolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, status, employeeId } = req.query as { month?: string; status?: string; employeeId?: string };
  const hasModuleAccess = isPayrollAuthorizedUser(req.user);

  // If not an authorized Payroll user (Shaju Sir / Pramod Sir), only allow self-payslip lookup if requested
  if (!hasModuleAccess) {
    if (employeeId && employeeId === req.user.id) {
      // Personal payslip view
    } else {
      res.status(403).json({
        success: false,
        message: 'Payroll module access is restricted exclusively to Shaju Sir and Pramod Sir.',
      });
      return;
    }
  }

  const where: any = {};
  if (req.user.organizationId) {
    where.organizationId = req.user.organizationId;
  }

  if (!hasModuleAccess) {
    where.employeeId = req.user.id;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }
  // Note: Do NOT exclude status='resigned' here so resignation-month & historical payrolls are visible!

  if (month) where.month = month;
  if (status && status !== 'all') where.status = status;

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          departmentId: true,
          status: true,
          remarks: true,
          employeeProfileDetail: { select: { resignationDate: true } },
        },
      },
      confirmer: { select: { id: true, name: true, email: true } },
      financeApprover: { select: { id: true, name: true, email: true } },
      processor: { select: { id: true, name: true } },
      transferer: { select: { id: true, name: true } },
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  });

  const formatted = payrolls.map((p) => ({
    ...p,
    arrears: Number(p.arrears || 0),
    employeeId: {
      id: p.user?.id || p.employeeId,
      name: p.user?.name || 'Employee',
      email: p.user?.email || '',
      designation: p.user?.designation || '',
      status: p.user?.status || 'active',
      remarks: p.user?.remarks || '',
      resignationDate: p.user?.employeeProfileDetail?.resignationDate || null,
    },
  }));

  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

export const getPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
        },
      },
      confirmer: { select: { id: true, name: true } },
      financeApprover: { select: { id: true, name: true } },
    },
  });

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  if (!isPayrollAuthorizedUser(req.user) && payroll.employeeId !== req.user.id) {
    res.status(403).json({ success: false, message: 'Not authorized to view this payroll record' });
    return;
  }

  const formatted = {
    ...payroll,
    arrears: Number(payroll.arrears || 0),
    employeeId: {
      id: payroll.user?.id || payroll.employeeId,
      name: payroll.user?.name || 'Employee',
      email: payroll.user?.email || '',
      designation: payroll.user?.designation || '',
      status: payroll.user?.status || 'active',
    },
  };

  res.json({ success: true, data: formatted });
});

export const createPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    employeeId,
    month,
    basicSalary,
    allowances = {},
    deductions = {},
    bonus = 0,
    overtime = 0,
    arrears = 0,
    professionalTax = 0,
    labourWelfareFund = 0,
    tds = 0,
    remarks,
    status = 'draft',
  } = req.body;

  if (!employeeId || !month || basicSalary === undefined) {
    res.status(400).json({ success: false, message: 'employeeId, month, and basicSalary are required' });
    return;
  }

  const allowancesTotal = sumAllowances(allowances);
  const deductionsTotal = sumDeductions(deductions, professionalTax, labourWelfareFund, tds);
  const grossSalary =
    Number(basicSalary) +
    allowancesTotal +
    Number(bonus || 0) +
    Number(overtime || 0) +
    Number(arrears || 0);
  const netSalary = Math.max(0, grossSalary - deductionsTotal);

  const payroll = await prisma.payroll.create({
    data: {
      organizationId: req.user.organizationId,
      employeeId,
      month,
      basicSalary: Number(basicSalary),
      allowances,
      deductions,
      bonus: Number(bonus || 0),
      overtime: Number(overtime || 0),
      arrears: Number(arrears || 0),
      professionalTax: Number(professionalTax || 0),
      labourWelfareFund: Number(labourWelfareFund || 0),
      tds: Number(tds || 0),
      grossSalary,
      netSalary,
      remarks,
      status: status as any,
    },
  });

  res.status(201).json({ success: true, data: payroll });
});

export const updatePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.payroll.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  const basicSalary = req.body.basicSalary !== undefined ? Number(req.body.basicSalary) : existing.basicSalary;
  const allowances = req.body.allowances !== undefined ? req.body.allowances : existing.allowances;
  const deductions = req.body.deductions !== undefined ? req.body.deductions : existing.deductions;
  const bonus = req.body.bonus !== undefined ? Number(req.body.bonus) : (existing.bonus || 0);
  const overtime = req.body.overtime !== undefined ? Number(req.body.overtime) : (existing.overtime || 0);
  const arrears = req.body.arrears !== undefined ? Number(req.body.arrears) : (existing.arrears || 0);
  const professionalTax = req.body.professionalTax !== undefined ? Number(req.body.professionalTax) : existing.professionalTax;
  const labourWelfareFund = req.body.labourWelfareFund !== undefined ? Number(req.body.labourWelfareFund) : existing.labourWelfareFund;
  const tds = req.body.tds !== undefined ? Number(req.body.tds) : existing.tds;

  const allowancesTotal = sumAllowances(allowances);
  const deductionsTotal = sumDeductions(deductions, professionalTax, labourWelfareFund, tds);
  const grossSalary = basicSalary + allowancesTotal + bonus + overtime + arrears;
  const netSalary = Math.max(0, grossSalary - deductionsTotal);

  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      basicSalary,
      allowances,
      deductions,
      bonus,
      overtime,
      arrears,
      professionalTax,
      labourWelfareFund,
      tds,
      grossSalary,
      netSalary,
      remarks: req.body.remarks !== undefined ? req.body.remarks : existing.remarks,
      status: req.body.status ? req.body.status : existing.status,
    },
  });

  res.json({ success: true, data: payroll });
});

// Dedicated endpoint to process Salary Arrears for an employee in a target payroll month
export const processSalaryArrears = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, month, amount, mode = 'add', fromPeriod, toPeriod, reason } = req.body;
  const arrearAmount = Number(amount);

  if (!employeeId || !month) {
    return res.status(400).json({ success: false, message: 'Employee and target payroll month (YYYY-MM) are required.' });
  }
  if (!Number.isFinite(arrearAmount) || arrearAmount < 0) {
    return res.status(400).json({ success: false, message: 'Please enter a valid arrear amount.' });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: employeeId },
    include: { salaryConfig: true, employeeProfileDetail: true },
  });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  const orgId = targetUser.organizationId || req.user.organizationId;
  const periodLabel =
    fromPeriod && toPeriod
      ? `${fromPeriod} to ${toPeriod}`
      : fromPeriod || toPeriod || 'prior period';
  const arrearNote = `Arrears (${periodLabel}): +₹${arrearAmount.toLocaleString('en-IN')}${reason ? ` — ${reason}` : ''}`;

  const existing = await prisma.payroll.findUnique({
    where: { employeeId_month: { employeeId, month } },
  });

  if (existing && ['transferred_to_finance', 'paid'].includes(existing.status)) {
    return res.status(400).json({
      success: false,
      message: `Payroll for ${month} is already ${existing.status.replace(/_/g, ' ')}. Please process arrears in an upcoming or draft payroll month.`,
    });
  }

  let saved;
  if (existing) {
    const nextArrears = mode === 'replace' ? arrearAmount : Number(existing.arrears || 0) + arrearAmount;
    const allowancesTotal = sumAllowances(existing.allowances);
    const deductionsTotal = sumDeductions(
      existing.deductions,
      existing.professionalTax,
      existing.labourWelfareFund,
      existing.tds
    );
    const grossSalary =
      Number(existing.basicSalary) +
      allowancesTotal +
      Number(existing.bonus || 0) +
      Number(existing.overtime || 0) +
      nextArrears;
    const netSalary = Math.max(0, grossSalary - deductionsTotal);
    const combinedRemarks = existing.remarks
      ? `${existing.remarks.replace(/\s*\|\s*Arrears[^|]*/gi, '')} | ${arrearNote}`
      : arrearNote;

    saved = await prisma.payroll.update({
      where: { id: existing.id },
      data: {
        arrears: nextArrears,
        grossSalary,
        netSalary,
        remarks: combinedRemarks,
      },
    });
  } else {
    const sc = targetUser.salaryConfig;
    const basicSalary = Number(sc?.basicSalary ?? targetUser.employeeProfileDetail?.basicSalary ?? 0);
    const allowances = sc?.allowances || {};
    const deductions = sc?.deductions || {};
    const professionalTax = Number(sc?.professionalTax || 0);
    const labourWelfareFund = Number(sc?.labourWelfareFund || 0);
    const tds = Number(sc?.tds || 0);

    const allowancesTotal = sumAllowances(allowances);
    const deductionsTotal = sumDeductions(deductions, professionalTax, labourWelfareFund, tds);
    const grossSalary = basicSalary + allowancesTotal + arrearAmount;
    const netSalary = Math.max(0, grossSalary - deductionsTotal);

    saved = await prisma.payroll.create({
      data: {
        organizationId: orgId,
        employeeId,
        month,
        basicSalary,
        allowances,
        deductions,
        bonus: 0,
        overtime: 0,
        arrears: arrearAmount,
        professionalTax,
        labourWelfareFund,
        tds,
        grossSalary,
        netSalary,
        status: 'draft',
        remarks: arrearNote,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Salary arrears of ₹${arrearAmount.toLocaleString('en-IN')} processed for ${targetUser.name} (${month}).`,
    data: saved,
  });
});

export const deletePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.findUnique({ where: { id: req.params.id } });
  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }
  await prisma.payroll.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const processPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      status: 'processed' as any,
      processedBy: req.user.id,
      processedAt: new Date(),
    },
  });
  res.status(200).json({ success: true, data: payroll });
});

export const confirmPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      status: 'confirmed' as any,
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
    },
    include: { user: { select: { name: true, email: true } } },
  });

  if (payroll.user?.email) {
    const monthStr = payroll.month;
    const html = `
      <h3>Your Payslip for ${monthStr} is Confirmed</h3>
      <p>Dear ${payroll.user.name},</p>
      <p>Your payroll for <strong>${monthStr}</strong> has been confirmed.</p>
      <p>Net Salary: ₹${payroll.netSalary.toLocaleString()}</p>
      <p>You can view and download your payslip once payment is finalized.</p>
      <br/>
      <p>Regards,<br/>PYPE ERP Payroll Team</p>
    `;
    sendEmail(payroll.user.email, `Payslip Confirmed: ${monthStr}`, html).catch(console.error);
  }

  res.status(200).json({ success: true, data: payroll });
});

export const markPayrollPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      status: 'paid' as any,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      paymentMethod: req.body.paymentMethod || 'bank_transfer',
      paymentReference: req.body.paymentReference || null,
    },
  });
  res.status(200).json({ success: true, data: payroll });
});

function toLocalDateStr(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  if (date.getUTCHours() === 18 && date.getUTCMinutes() === 30) {
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function parseTimeMins(timeStr: string | null | undefined, defH: number, defM = 0): number {
  if (!timeStr || typeof timeStr !== 'string') return defH * 60 + defM;
  const [h, m] = timeStr.split(':').map(Number);
  return (Number.isFinite(h) ? h : defH) * 60 + (Number.isFinite(m) ? m : defM);
}

async function generatePayrollCore(req: AuthRequest, month: string, isSmart: boolean = true) {
  const parts = month.split('-');
  const year = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(m) || m < 1 || m > 12) {
    throw new Error('Invalid month format, expected YYYY-MM');
  }

  const totalDaysInMonth = new Date(year, m, 0).getDate();
  const queryStart = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0) - 24 * 3600 * 1000);
  const queryEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999) + 24 * 3600 * 1000);

  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().slice(0, 10);

  const [hrSettings, holidays, candidateUsers, existingPayrolls, resignAuditLogs] = await Promise.all([
    prisma.hRSettings.findFirst({
      where: { organizationId: req.user.organizationId },
    }),
    prisma.holiday.findMany({
      where: {
        organizationId: req.user.organizationId,
        date: { gte: queryStart, lte: queryEnd },
      },
    }),
    prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { in: ['active', 'resigned'] as any },
        role: {
          notIn: ['ceo', 'org_admin', 'superadmin', 'center_admin', 'student'],
        },
      },
      include: {
        salaryConfig: true,
        employeeProfile: true,
        employeeProfileDetail: { include: { shift: true } },
      },
    }),
    prisma.payroll.findMany({
      where: { organizationId: req.user.organizationId, month },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId: req.user.organizationId,
        action: 'USER_STATUS_RESIGNED',
      },
      orderBy: { timestamp: 'desc' },
    }),
  ]);

  const existingPayrollMap = new Map(existingPayrolls.map((p) => [p.employeeId, p]));
  const resignAuditMap = new Map<string, Date>();
  for (const log of resignAuditLogs) {
    if (log.entityId && !resignAuditMap.has(log.entityId)) {
      resignAuditMap.set(log.entityId, log.timestamp);
    }
  }

  // Resolve effective resignation date for resigned users & filter eligible users for target month
  const userResignDateMap = new Map<string, string>();
  const users = candidateUsers.filter((u) => {
    if (u.status !== 'resigned') return true;
    const fromProfile = toLocalDateStr(u.employeeProfileDetail?.resignationDate);
    const fromRemarks = String(u.remarks || '').match(/Resigned on (\d{4}-\d{2}-\d{2})/i)?.[1] || '';
    const fromAudit = toLocalDateStr(resignAuditMap.get(u.id));
    const fromUpdated = toLocalDateStr(u.updatedAt);
    const effectiveResignDate = fromProfile || fromRemarks || fromAudit || fromUpdated;
    if (effectiveResignDate) {
      userResignDateMap.set(u.id, effectiveResignDate);
    }
    // Include resigned employee ONLY if their month of resignation matches the target payroll month
    return Boolean(effectiveResignDate && effectiveResignDate.slice(0, 7) === month);
  });

  let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let defaultCheckInTime = '09:00';
  let defaultCheckOutTime = '18:00';
  let defaultBreakMins = 60;
  let defaultGraceMinutes = 15;
  let dayOverrides: any[] = [];
  let latePolicyDeductionPerMinute = 0;
  let maxLateMinutesPerMonth = 0;
  let deductMode: 'beyond_grace' | 'from_start' = 'beyond_grace';
  let lateCountForHalfDay = 0;
  let lateSlabRules: any[] = [];

  if (hrSettings?.officeHours) {
    const oh: any = typeof hrSettings.officeHours === 'string'
      ? JSON.parse(hrSettings.officeHours)
      : hrSettings.officeHours;
    if (Array.isArray(oh?.workingDays) && oh.workingDays.length > 0) {
      workingDays = oh.workingDays;
    }
    if (oh?.checkInTime) defaultCheckInTime = oh.checkInTime;
    if (oh?.checkOutTime) defaultCheckOutTime = oh.checkOutTime;
    if (oh?.breakDurationMinutes !== undefined) defaultBreakMins = Number(oh.breakDurationMinutes) || 0;
    if (oh?.graceMinutes !== undefined) defaultGraceMinutes = Math.max(0, Number(oh.graceMinutes) || 0);
    if (Array.isArray(oh?.dayOverrides)) dayOverrides = oh.dayOverrides;
  }
  if (hrSettings?.latePolicy) {
    const lp: any = typeof hrSettings.latePolicy === 'string'
      ? JSON.parse(hrSettings.latePolicy)
      : hrSettings.latePolicy;
    if (Number(lp?.deductionPerExtraMinute) > 0) {
      latePolicyDeductionPerMinute = Number(lp.deductionPerExtraMinute);
    }
    if (lp?.maxLateMinutesPerMonth !== undefined) {
      maxLateMinutesPerMonth = Math.max(0, Number(lp.maxLateMinutesPerMonth) || 0);
    }
    if (lp?.deductMode === 'from_start') {
      deductMode = 'from_start';
    }
    if (Number(lp?.lateCountForHalfDay) > 0) {
      lateCountForHalfDay = Number(lp.lateCountForHalfDay);
    }
  }
  if (hrSettings?.lateDeductionRules) {
    const parsedRules = typeof hrSettings.lateDeductionRules === 'string'
      ? JSON.parse(hrSettings.lateDeductionRules)
      : hrSettings.lateDeductionRules;
    if (Array.isArray(parsedRules)) lateSlabRules = parsedRules;
  }

  const holidayDateSet = new Set<string>();
  holidays.forEach((h) => {
    const dStr = toLocalDateStr(h.date);
    if (dStr) holidayDateSet.add(dStr);
  });

  const userIds = users.map((u) => u.id);
  const [allAttendances, allLeaves] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        organizationId: req.user.organizationId,
        userId: { in: userIds },
        date: { gte: queryStart, lte: queryEnd },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: req.user.organizationId,
        userId: { in: userIds },
        status: 'approved',
        startDate: { lte: queryEnd },
        endDate: { gte: queryStart },
      },
    }),
  ]);

  const userAttendancesMap = new Map<string, Map<string, any>>();
  for (const att of allAttendances) {
    if (!userAttendancesMap.has(att.userId)) {
      userAttendancesMap.set(att.userId, new Map());
    }
    const dStr = toLocalDateStr(att.date);
    if (dStr) {
      userAttendancesMap.get(att.userId)!.set(dStr, att);
    }
  }

  const userLeavesMap = new Map<string, any[]>();
  for (const leave of allLeaves) {
    if (!userLeavesMap.has(leave.userId)) {
      userLeavesMap.set(leave.userId, []);
    }
    userLeavesMap.get(leave.userId)!.push(leave);
  }

  const generated = [];
  const errors = [];

  for (const user of users) {
    // Do not overwrite already confirmed / transferred / paid payrolls
    const existingPayroll = existingPayrollMap.get(user.id);
    if (existingPayroll && ['confirmed', 'transferred_to_finance', 'paid'].includes(existingPayroll.status)) {
      generated.push(existingPayroll);
      continue;
    }

    if (!user.salaryConfig) {
      errors.push(`User ${user.name} missing salary config`);
      continue;
    }

    const {
      basicSalary,
      allowances,
      deductions,
      professionalTax = 0,
      labourWelfareFund = 0,
      tds = 0,
      lateDeductionPerMinute = 0,
      lateDeductionEnabled: scLateEnabled,
    } = user.salaryConfig;

    const empShift = user.employeeProfileDetail?.shift || null;
    const isLateDeductionEnabled =
      isSmart &&
      !empShift?.isOpenShift &&
      (scLateEnabled ?? user.employeeProfileDetail?.lateDeductionEnabled ?? true) !== false;

    const parsedAllowances: any = typeof allowances === 'string' ? JSON.parse(allowances) : (allowances || {});
    const allowancesTotal = sumAllowances(parsedAllowances);
    const fixedMonthlyGross = basicSalary + allowancesTotal;
    const perDaySalary = totalDaysInMonth > 0 ? fixedMonthlyGross / totalDaysInMonth : 0;

    const parsedDeductions: any = typeof deductions === 'string' ? JSON.parse(deductions) : (deductions || {});

    const joinDateStr = toLocalDateStr(user.employeeProfileDetail?.joinDate || user.employeeProfile?.joinDate);
    const resignDateStr = userResignDateMap.get(user.id) || '';

    const getDayShiftSchedule = (dayOfWeek: string) => {
      if (empShift?.isOpenShift) {
        return { isOpen: true, expectedMins: 0, graceMins: 0, netShiftMins: 480 };
      }
      if (empShift && empShift.startTime) {
        const sM = parseTimeMins(empShift.startTime, 9, 0);
        const eM = parseTimeMins(empShift.endTime || defaultCheckOutTime, 18, 0);
        return {
          isOpen: false,
          expectedMins: sM,
          graceMins: Math.max(0, Number(empShift.graceTimeMinutes ?? 15)),
          netShiftMins: Math.max(240, eM - sM - defaultBreakMins),
        };
      }
      const ov = dayOverrides.find((o: any) => o?.day === dayOfWeek);
      const sM = parseTimeMins(ov?.checkInTime || defaultCheckInTime, 9, 0);
      const eM = parseTimeMins(ov?.checkOutTime || defaultCheckOutTime, 18, 0);
      const bM = ov?.breakDurationMinutes !== undefined ? Number(ov.breakDurationMinutes) || 0 : defaultBreakMins;
      return {
        isOpen: false,
        expectedMins: sM,
        graceMins: defaultGraceMinutes,
        netShiftMins: Math.max(240, eM - sM - bM),
      };
    };

    const userAttMap = userAttendancesMap.get(user.id) || new Map<string, any>();
    const userLeaves = userLeavesMap.get(user.id) || [];

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let paidHolidayDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let totalDeductibleLateMinutes = 0;
    let slabOrFixedLateDeductions = 0;
    let preJoiningDays = 0;
    let postResignationDays = 0;
    let defaultNetShiftMins = 480;

    const dayMeta: Array<{
      day: number;
      dayStr: string;
      dayOfWeek: string;
      isPreJoining: boolean;
      isPostResignation: boolean;
      isHoliday: boolean;
      isWeeklyOff: boolean;
      isScheduledWorkDay: boolean;
      workedOrPaidLeave: boolean;
      explicitAbsent: boolean;
    }> = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(Date.UTC(year, m - 1, day, 0, 0, 0, 0));
      const dayStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

      const att = userAttMap.get(dayStr);
      const matchingLeave = userLeaves.find((l) => {
        const startStr = toLocalDateStr(l.startDate);
        const endStr = toLocalDateStr(l.endDate);
        return dayStr >= startStr && dayStr <= endStr;
      });

      const isPreJoining = Boolean(joinDateStr && dayStr < joinDateStr);
      const isPostResignation = Boolean(resignDateStr && dayStr > resignDateStr);
      const isHoliday = holidayDateSet.has(dayStr);
      const isWeeklyOff = !workingDays.includes(dayOfWeek);
      const isScheduledWorkDay = !isHoliday && !isWeeklyOff;

      // 1. Post-resignation days without actual punches are non-payable
      if (isPostResignation && (!att || !att.checkIn)) {
        absentDays += 1;
        postResignationDays += 1;
        dayMeta.push({
          day,
          dayStr,
          dayOfWeek,
          isPreJoining,
          isPostResignation: true,
          isHoliday,
          isWeeklyOff,
          isScheduledWorkDay,
          workedOrPaidLeave: false,
          explicitAbsent: true,
        });
        continue;
      }

      // 2. Recorded attendance
      if (att) {
        if (att.status === 'half_day' || att.isHalfDay) {
          halfDays += 1;
          presentDays += 0.5;
          absentDays += 0.5;
          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: true, explicitAbsent: false,
          });
        } else if (att.status === 'present' || att.status === 'late' || att.status === 'work_from_home' || att.isWFH) {
          presentDays += 1;
          const sched = getDayShiftSchedule(dayOfWeek);
          defaultNetShiftMins = sched.netShiftMins;

          if (!sched.isOpen) {
            let dayLateMins = Number(att.lateMinutes) || 0;
            if (dayLateMins === 0 && att.checkIn) {
              const d = new Date(att.checkIn);
              if (!isNaN(d.getTime())) {
                const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
                const cMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
                const diff = cMins - sched.expectedMins;
                if (diff > sched.graceMins) dayLateMins = diff;
              }
            } else if (dayLateMins > 0 && dayLateMins <= sched.graceMins) {
              // Within employee's shift grace period
              dayLateMins = 0;
            }

            if (dayLateMins > 0) {
              lateDays += 1;
              totalLateMinutes += dayLateMins;
              const deductibleMins =
                deductMode === 'from_start' ? dayLateMins : Math.max(0, dayLateMins - sched.graceMins);

              if (isLateDeductionEnabled) {
                // Check custom slab rule first
                const matchedSlab = lateSlabRules.find((r: any) => {
                  const minM = Number(r.minMinutes ?? 0);
                  const maxM = r.maxMinutes ? Number(r.maxMinutes) : Infinity;
                  return dayLateMins >= minM && dayLateMins <= maxM;
                });
                if (matchedSlab) {
                  if (matchedSlab.deductionType === 'half_day') slabOrFixedLateDeductions += perDaySalary * 0.5;
                  else if (matchedSlab.deductionType === 'full_day') slabOrFixedLateDeductions += perDaySalary;
                  else slabOrFixedLateDeductions += Number(matchedSlab.amount) || 0;
                } else {
                  totalDeductibleLateMinutes += deductibleMins;
                }
              }
            }
          }

          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: true, explicitAbsent: false,
          });
        } else if (att.status === 'leave') {
          if (matchingLeave && matchingLeave.type === 'unpaid') {
            unpaidLeaveDays += 1;
            absentDays += 1;
            dayMeta.push({
              day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
              isHoliday, isWeeklyOff, isScheduledWorkDay,
              workedOrPaidLeave: false, explicitAbsent: true,
            });
          } else {
            paidLeaveDays += 1;
            dayMeta.push({
              day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
              isHoliday, isWeeklyOff, isScheduledWorkDay,
              workedOrPaidLeave: true, explicitAbsent: false,
            });
          }
        } else if (att.status === 'absent') {
          absentDays += 1;
          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: false, explicitAbsent: true,
          });
        }
        continue;
      }

      // 3. Pre-joining days
      if (isPreJoining) {
        absentDays += 1;
        preJoiningDays += 1;
        dayMeta.push({
          day, dayStr, dayOfWeek, isPreJoining: true, isPostResignation,
          isHoliday, isWeeklyOff, isScheduledWorkDay,
          workedOrPaidLeave: false, explicitAbsent: true,
        });
        continue;
      }

      // 4. Approved leave
      if (matchingLeave && dayStr <= todayStr) {
        if (matchingLeave.type === 'unpaid') {
          unpaidLeaveDays += 1;
          absentDays += 1;
          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: false, explicitAbsent: true,
          });
        } else if (matchingLeave.isHalfDay) {
          halfDays += 1;
          paidLeaveDays += 0.5;
          absentDays += 0.5;
          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: true, explicitAbsent: false,
          });
        } else {
          paidLeaveDays += 1;
          dayMeta.push({
            day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
            isHoliday, isWeeklyOff, isScheduledWorkDay,
            workedOrPaidLeave: true, explicitAbsent: false,
          });
        }
        continue;
      }

      // 5. Company Holiday or Weekly Off
      if (isHoliday || isWeeklyOff) {
        dayMeta.push({
          day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
          isHoliday, isWeeklyOff, isScheduledWorkDay: false,
          workedOrPaidLeave: false, explicitAbsent: false,
        });
        continue;
      }

      // 6. Unmarked scheduled working day
      absentDays += 1;
      dayMeta.push({
        day, dayStr, dayOfWeek, isPreJoining, isPostResignation,
        isHoliday, isWeeklyOff, isScheduledWorkDay: true,
        workedOrPaidLeave: false, explicitAbsent: true,
      });
    }

    // Evaluate paid Company Holidays & Weekly Offs (excluding pre-joining and post-resignation days)
    let paidWeeklyOffDays = 0;
    for (let i = 0; i < dayMeta.length; i++) {
      const dm = dayMeta[i];
      if (dm.isPreJoining || dm.isPostResignation || dm.workedOrPaidLeave || dm.explicitAbsent) continue;
      if (!dm.isHoliday && !dm.isWeeklyOff) continue;

      let prevWorked = false;
      for (let p = i - 1; p >= 0; p--) {
        if (dayMeta[p].isPostResignation) break;
        if (dayMeta[p].isScheduledWorkDay) {
          prevWorked = dayMeta[p].workedOrPaidLeave;
          break;
        }
      }
      let nextWorked = false;
      for (let n = i + 1; n < dayMeta.length; n++) {
        if (dayMeta[n].isPostResignation) break;
        if (dayMeta[n].isScheduledWorkDay) {
          nextWorked = dayMeta[n].workedOrPaidLeave;
          break;
        }
      }

      if (prevWorked || nextWorked) {
        if (dm.isHoliday) paidHolidayDays += 1;
        else paidWeeklyOffDays += 1;
      }
    }

    // Compute total Late Arrival Deduction (honoring grace period, monthly free pool, late-count rule, and per-employee toggle)
    let smartLateDeductions = 0;
    if (isLateDeductionEnabled) {
      smartLateDeductions += slabOrFixedLateDeductions;

      const netBillableLateMins = Math.max(0, totalDeductibleLateMinutes - maxLateMinutesPerMonth);
      if (netBillableLateMins > 0) {
        const perMin =
          Number(lateDeductionPerMinute) > 0
            ? Number(lateDeductionPerMinute)
            : latePolicyDeductionPerMinute > 0
            ? latePolicyDeductionPerMinute
            : perDaySalary / Math.max(240, defaultNetShiftMins);
        smartLateDeductions += netBillableLateMins * perMin;
      }

      if (lateCountForHalfDay > 0 && lateDays >= lateCountForHalfDay) {
        const halfDayPenalties = Math.floor(lateDays / lateCountForHalfDay);
        smartLateDeductions += halfDayPenalties * 0.5 * perDaySalary;
      }
    }
    const roundedLateDeduction = isLateDeductionEnabled ? Math.round(smartLateDeductions) : 0;

    let payableDays = 0;
    let lopDeduction = 0;
    if (presentDays === 0 && paidLeaveDays === 0 && halfDays === 0) {
      payableDays = 0;
      paidHolidayDays = 0;
      paidWeeklyOffDays = 0;
      absentDays = totalDaysInMonth;
      lopDeduction = fixedMonthlyGross;
    } else {
      payableDays = Math.min(
        totalDaysInMonth,
        Math.max(0, parseFloat((presentDays + paidLeaveDays + paidHolidayDays + paidWeeklyOffDays).toFixed(1)))
      );
      absentDays = Math.max(0, parseFloat((totalDaysInMonth - payableDays).toFixed(1)));
      const earnedGross = Math.round(perDaySalary * payableDays);
      lopDeduction = Math.max(0, Math.min(fixedMonthlyGross, fixedMonthlyGross - earnedGross));
    }

    let finalDeductions: any;
    if (Array.isArray(parsedDeductions)) {
      finalDeductions = parsedDeductions.filter((d: any) =>
        d.name !== 'Loss of Pay (Absenteeism)' &&
        d.name !== 'Late Arrival Penalty' &&
        d.name !== 'Late Deduction (Attendance)'
      );
      if (lopDeduction > 0) finalDeductions.push({ name: 'Loss of Pay (Absenteeism)', amount: lopDeduction });
      if (roundedLateDeduction > 0) finalDeductions.push({ name: 'Late Arrival Penalty', amount: roundedLateDeduction });
    } else {
      finalDeductions = { ...parsedDeductions };
      delete finalDeductions.loss_of_pay;
      delete finalDeductions.late_arrival;
      delete finalDeductions.late_deduction;
      delete finalDeductions.tax;
      if (lopDeduction > 0) finalDeductions.loss_of_pay = lopDeduction;
      if (roundedLateDeduction > 0) finalDeductions.late_arrival = roundedLateDeduction;
    }

    const preservedBonus = Number(existingPayroll?.bonus || 0);
    const preservedOvertime = Number(existingPayroll?.overtime || 0);
    const preservedArrears = Number(existingPayroll?.arrears || 0);

    const deductionsTotal = sumDeductions(finalDeductions, professionalTax, labourWelfareFund, tds);
    const grossSalary = fixedMonthlyGross + preservedBonus + preservedOvertime + preservedArrears;
    const netSalary = Math.max(0, grossSalary - deductionsTotal);

    let remarks = '';
    if (payableDays === 0 && preservedArrears === 0) {
      remarks = `No attendance recorded (0 working days). Full Loss of Pay: -₹${lopDeduction.toLocaleString('en-IN')}`;
    } else {
      const pList = [`Att: ${presentDays}P, ${absentDays}A`];
      if (halfDays > 0) pList.push(`${halfDays}HD`);
      if (paidLeaveDays > 0) pList.push(`${paidLeaveDays}L`);
      if (paidHolidayDays > 0) pList.push(`${paidHolidayDays}H`);
      if (lateDays > 0) pList.push(`${lateDays}Late (${totalLateMinutes}m)`);

      let summary = pList.join(', ');
      summary += ` | Payable: ${payableDays}/${totalDaysInMonth} days`;
      if (lopDeduction > 0) summary += ` | LOP: -₹${lopDeduction.toLocaleString('en-IN')}`;
      if (roundedLateDeduction > 0) summary += ` | Late: -₹${roundedLateDeduction.toLocaleString('en-IN')}`;
      if (!isLateDeductionEnabled && lateDays > 0 && isSmart) summary += ` (Late Exempt)`;
      if (preservedArrears > 0) summary += ` | Arrears: +₹${preservedArrears.toLocaleString('en-IN')}`;
      if (lopDeduction === 0 && roundedLateDeduction === 0) summary += ` (Full attendance)`;
      if (preJoiningDays > 0) summary += ` (Joined: ${joinDateStr})`;
      if (resignDateStr) summary += ` (Resigned: ${resignDateStr})`;
      remarks = summary;
    }

    try {
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month: {
            employeeId: user.id,
            month,
          },
        },
        update: {
          basicSalary,
          allowances: parsedAllowances,
          deductions: finalDeductions,
          bonus: preservedBonus,
          overtime: preservedOvertime,
          arrears: preservedArrears,
          professionalTax: Number(professionalTax || 0),
          labourWelfareFund: Number(labourWelfareFund || 0),
          tds: Number(tds || 0),
          grossSalary,
          netSalary,
          remarks,
        },
        create: {
          organizationId: req.user.organizationId,
          employeeId: user.id,
          month,
          basicSalary,
          allowances: parsedAllowances,
          deductions: finalDeductions,
          bonus: preservedBonus,
          overtime: preservedOvertime,
          arrears: preservedArrears,
          professionalTax: Number(professionalTax || 0),
          labourWelfareFund: Number(labourWelfareFund || 0),
          tds: Number(tds || 0),
          grossSalary,
          netSalary,
          status: 'draft',
          remarks,
        },
      });
      generated.push(payroll);
    } catch (err: any) {
      errors.push(`Failed to generate for ${user.name}: ${err.message}`);
    }
  }

  try {
    const batches = await prisma.payrollBatch.findMany({
      where: {
        organizationId: req.user.organizationId,
        month,
        status: { not: 'completed' },
      },
    });
    for (const batch of batches) {
      if (batch.payrollIds && batch.payrollIds.length > 0) {
        const batchPayrolls = await prisma.payroll.findMany({
          where: { id: { in: batch.payrollIds } },
          select: { netSalary: true },
        });
        const newTotal = batchPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        await prisma.payrollBatch.update({
          where: { id: batch.id },
          data: { totalAmount: newTotal },
        });
      }
    }
  } catch (_ignored) {}

  return { generated, errors };
}

export const generateMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body;
  if (!month) {
    res.status(400).json({ success: false, message: 'Month is required (format: YYYY-MM)' });
    return;
  }

  const { generated, errors } = await generatePayrollCore(req, month, false);
  res.status(201).json({ success: true, count: generated.length, data: generated, errors });
});

export const generateSmartPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body;
  if (!month) {
    res.status(400).json({ success: false, message: 'Month is required (format: YYYY-MM)' });
    return;
  }

  const { generated, errors } = await generatePayrollCore(req, month, true);
  res.status(201).json({ success: true, count: generated.length, data: generated, errors });
});

export const transferToFinance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { payrollIds, month, remarks } = req.body;

  if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
    res.status(400).json({ success: false, message: 'Select at least one payroll to transfer' });
    return;
  }

  const payrolls = await prisma.payroll.findMany({
    where: {
      id: { in: payrollIds },
      organizationId: req.user.organizationId,
    },
  });

  if (payrolls.length === 0) {
    res.status(404).json({ success: false, message: 'No valid payroll records found for the given IDs' });
    return;
  }

  const totalAmount = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const batchMonth = month || payrolls[0].month || new Date().toISOString().slice(0, 7);

  const batch = await prisma.payrollBatch.create({
    data: {
      organizationId: req.user.organizationId,
      month: batchMonth,
      payrollIds,
      totalAmount,
      employeeCount: payrolls.length,
      transferredBy: req.user.id,
      remarks: remarks || null,
      status: 'pending_finance_approval',
    },
  });

  await prisma.payroll.updateMany({
    where: { id: { in: payrollIds } },
    data: {
      status: 'transferred_to_finance',
      transferredToFinanceBy: req.user.id,
      transferredToFinanceAt: new Date(),
    },
  });

  res.status(201).json({ success: true, data: batch });
});

export const getPayrollBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query as { status?: string };

  const where: any = { organizationId: req.user.organizationId };
  if (status && status !== 'all') {
    where.status = status;
  }

  const batches = await prisma.payrollBatch.findMany({
    where,
    include: {
      transferer: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      rejector: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = batches.map((b) => ({
    ...b,
    transferredBy: b.transferer || (b.transferredBy ? { name: b.transferredBy } : undefined),
    approvedBy: b.approver || (b.approvedBy ? { name: b.approvedBy } : undefined),
    rejectedBy: b.rejector || (b.rejectedBy ? { name: b.rejectedBy } : undefined),
  }));

  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

export const getPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findUnique({
    where: { id: req.params.id },
    include: {
      transferer: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      rejector: { select: { id: true, name: true, email: true } },
    },
  });

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  let payrolls: any[] = [];
  if (batch.payrollIds && batch.payrollIds.length > 0) {
    payrolls = await prisma.payroll.findMany({
      where: { id: { in: batch.payrollIds } },
      include: {
        user: { select: { id: true, name: true, email: true, designation: true, status: true } },
      },
    });
  }

  const formatted = {
    ...batch,
    transferredBy: batch.transferer || (batch.transferredBy ? { name: batch.transferredBy } : undefined),
    approvedBy: batch.approver || (batch.approvedBy ? { name: batch.approvedBy } : undefined),
    rejectedBy: batch.rejector || (batch.rejectedBy ? { name: batch.rejectedBy } : undefined),
    payrolls: payrolls.map((p) => ({
      ...p,
      arrears: Number(p.arrears || 0),
      employeeId: {
        id: p.user?.id || p.employeeId,
        name: p.user?.name || 'Employee',
        email: p.user?.email || '',
        designation: p.user?.designation || '',
        status: p.user?.status || 'active',
      },
    })),
  };

  res.json({ success: true, data: formatted });
});

export const financeApprovePayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  const updatedBatch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: {
      status: 'approved_by_finance',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      remarks: req.body.remarks || batch.remarks,
    },
  });

  if (batch.payrollIds && batch.payrollIds.length > 0) {
    await prisma.payroll.updateMany({
      where: { id: { in: batch.payrollIds } },
      data: {
        financeApprovedBy: req.user.id,
        financeApprovedAt: new Date(),
      },
    });
  }

  res.status(200).json({ success: true, data: updatedBatch });
});

export const financeRejectPayrollBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  const reason = req.body.rejectionReason || req.body.remarks || 'Rejected by finance';

  const updatedBatch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected',
      rejectedBy: req.user.id,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  if (batch.payrollIds && batch.payrollIds.length > 0) {
    await prisma.payroll.updateMany({
      where: { id: { in: batch.payrollIds } },
      data: {
        status: 'confirmed',
        remarks: `Batch rejected: ${reason}`,
      },
    });
  }

  res.status(200).json({ success: true, data: updatedBatch });
});

export const markBatchPaymentInProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'payment_in_progress' },
  });
  res.status(200).json({ success: true, data: batch });
});

export const completeBatchPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  const updatedBatch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  if (batch.payrollIds && batch.payrollIds.length > 0) {
    const validMethod = ['bank_transfer', 'cash', 'cheque'].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : 'bank_transfer';

    await prisma.payroll.updateMany({
      where: { id: { in: batch.payrollIds } },
      data: {
        status: 'paid',
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        paymentMethod: validMethod as any,
        paymentReference: req.body.paymentReference || null,
      },
    });
  }

  res.status(200).json({ success: true, data: updatedBatch });
});
