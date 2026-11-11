// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/mailer.js';

const ADMIN_ROLES = ['hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance', 'org_admin', 'ceo', 'superadmin'];

export const getPayrolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, status, employeeId } = req.query as { month?: string; status?: string; employeeId?: string };

  let where: any = { organizationId: req.user.organizationId };

  // If not HR/Finance/Admin, restrict to current user's own payrolls
  if (!ADMIN_ROLES.includes(req.user.role)) {
    where.employeeId = req.user.id;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }

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
        }
      },
      confirmer: { select: { id: true, name: true, email: true } },
      financeApprover: { select: { id: true, name: true, email: true } },
      processor: { select: { id: true, name: true } },
      transferer: { select: { id: true, name: true } }
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }]
  });

  // Map employeeId to an object for frontend compatibility while preserving user
  const formatted = payrolls.map((p) => ({
    ...p,
    employeeId: {
      id: p.user?.id || p.employeeId,
      name: p.user?.name || 'Employee',
      email: p.user?.email || '',
      designation: p.user?.designation || '',
    }
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
        }
      },
      confirmer: { select: { id: true, name: true } },
      financeApprover: { select: { id: true, name: true } }
    }
  });

  if (!payroll) {
    res.status(404).json({ success: false, message: 'Payroll record not found' });
    return;
  }

  // Security check: non-admin can only view their own
  if (!ADMIN_ROLES.includes(req.user.role) && payroll.employeeId !== req.user.id) {
    res.status(403).json({ success: false, message: 'Not authorized to view this payroll record' });
    return;
  }

  const formatted = {
    ...payroll,
    employeeId: {
      id: payroll.user?.id || payroll.employeeId,
      name: payroll.user?.name || 'Employee',
      email: payroll.user?.email || '',
      designation: payroll.user?.designation || '',
    }
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
    professionalTax = 0,
    labourWelfareFund = 0,
    tds = 0,
    remarks,
    status = 'draft'
  } = req.body;

  if (!employeeId || !month || basicSalary === undefined) {
    res.status(400).json({ success: false, message: 'employeeId, month, and basicSalary are required' });
    return;
  }

  let allowancesTotal = 0;
  if (Array.isArray(allowances)) {
    allowances.forEach((a: any) => allowancesTotal += Number(a.amount || 0));
  } else if (typeof allowances === 'object' && allowances !== null) {
    Object.values(allowances).forEach((v: any) => allowancesTotal += Number(v || 0));
  }

  let deductionsTotal = Number(professionalTax || 0) + Number(labourWelfareFund || 0) + Number(tds || 0);
  if (Array.isArray(deductions)) {
    deductions.forEach((d: any) => deductionsTotal += Number(d.amount || 0));
  } else if (typeof deductions === 'object' && deductions !== null) {
    Object.values(deductions).forEach((v: any) => deductionsTotal += Number(v || 0));
  }

  const grossSalary = Number(basicSalary) + allowancesTotal + Number(bonus || 0) + Number(overtime || 0);
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
      professionalTax: Number(professionalTax || 0),
      labourWelfareFund: Number(labourWelfareFund || 0),
      tds: Number(tds || 0),
      grossSalary,
      netSalary,
      remarks,
      status: status as any
    }
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
  const professionalTax = req.body.professionalTax !== undefined ? Number(req.body.professionalTax) : existing.professionalTax;
  const labourWelfareFund = req.body.labourWelfareFund !== undefined ? Number(req.body.labourWelfareFund) : existing.labourWelfareFund;
  const tds = req.body.tds !== undefined ? Number(req.body.tds) : existing.tds;

  let allowancesTotal = 0;
  if (Array.isArray(allowances)) {
    allowances.forEach((a: any) => allowancesTotal += Number(a.amount || 0));
  } else if (typeof allowances === 'object' && allowances !== null) {
    Object.values(allowances).forEach((v: any) => allowancesTotal += Number(v || 0));
  }

  let deductionsTotal = Number(professionalTax || 0) + Number(labourWelfareFund || 0) + Number(tds || 0);
  if (Array.isArray(deductions)) {
    deductions.forEach((d: any) => deductionsTotal += Number(d.amount || 0));
  } else if (typeof deductions === 'object' && deductions !== null) {
    Object.values(deductions).forEach((v: any) => deductionsTotal += Number(v || 0));
  }

  const grossSalary = basicSalary + allowancesTotal + bonus + overtime;
  const netSalary = Math.max(0, grossSalary - deductionsTotal);

  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      basicSalary,
      allowances,
      deductions,
      bonus,
      overtime,
      professionalTax,
      labourWelfareFund,
      tds,
      grossSalary,
      netSalary,
      remarks: req.body.remarks !== undefined ? req.body.remarks : existing.remarks,
      status: req.body.status ? req.body.status : existing.status
    }
  });

  res.json({ success: true, data: payroll });
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
      processedAt: new Date()
    }
  });
  res.status(200).json({ success: true, data: payroll });
});

export const confirmPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payroll = await prisma.payroll.update({
    where: { id: req.params.id },
    data: {
      status: 'confirmed' as any,
      confirmedBy: req.user.id,
      confirmedAt: new Date()
    },
    include: { user: { select: { name: true, email: true } } }
  });

  if (payroll.user?.email) {
    const monthStr = payroll.month;
    const html = `
      <h3>Your Payslip for ${monthStr} is Confirmed</h3>
      <p>Dear ${payroll.user.name},</p>
      <p>Your payroll for <strong>${monthStr}</strong> has been confirmed by HR.</p>
      <p>Net Salary: ₹${payroll.netSalary.toLocaleString()}</p>
      <p>You can view and download your payslip from your employee portal once payment is finalized.</p>
      <br/>
      <p>Regards,<br/>PYPE ERP HR Team</p>
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
      paymentReference: req.body.paymentReference || null
    }
  });
  res.status(200).json({ success: true, data: payroll });
});

// Helper to convert date to YYYY-MM-DD cleanly supporting both UTC and IST
function toLocalDateStr(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  // Check if date has an IST offset embedded (e.g. 18:30:00 UTC = 00:00:00 IST)
  if (date.getUTCHours() === 18 && date.getUTCMinutes() === 30) {
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

// Helper for generating monthly payroll (basic and smart)
async function generatePayrollCore(req: AuthRequest, month: string, isSmart: boolean = false) {
  // Parse month
  const parts = month.split('-');
  const year = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(m) || m < 1 || m > 12) {
    throw new Error('Invalid month format, expected YYYY-MM');
  }

  // Total calendar days in the target month (e.g., 30 for Nov, 31 for Oct, 28/29 for Feb)
  const totalDaysInMonth = new Date(year, m, 0).getDate();

  // Query date boundaries with +/- 24h buffer for timezone safety
  const queryStart = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0) - 24 * 3600 * 1000);
  const queryEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999) + 24 * 3600 * 1000);

  // Today in IST
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().slice(0, 10);

  // Fetch HR Settings and Holidays for the organization
  const [hrSettings, holidays, users] = await Promise.all([
    prisma.hRSettings.findFirst({
      where: { organizationId: req.user.organizationId }
    }),
    prisma.holiday.findMany({
      where: {
        organizationId: req.user.organizationId,
        date: { gte: queryStart, lte: queryEnd }
      }
    }),
    prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: 'active' as any,
        role: {
          notIn: ['ceo', 'org_admin', 'superadmin', 'center_admin', 'student']
        }
      },
      include: {
        salaryConfig: true,
        employeeProfile: true
      }
    })
  ]);

  // Working days (default Mon-Sat if not specified)
  let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let latePolicyDeductionPerMinute = 0;
  if (hrSettings?.officeHours) {
    const oh: any = typeof hrSettings.officeHours === 'string'
      ? JSON.parse(hrSettings.officeHours)
      : hrSettings.officeHours;
    if (Array.isArray(oh?.workingDays) && oh.workingDays.length > 0) {
      workingDays = oh.workingDays;
    }
  }
  if (hrSettings?.latePolicy) {
    const lp: any = typeof hrSettings.latePolicy === 'string'
      ? JSON.parse(hrSettings.latePolicy)
      : hrSettings.latePolicy;
    if (Number(lp?.deductionPerExtraMinute) > 0) {
      latePolicyDeductionPerMinute = Number(lp.deductionPerExtraMinute);
    }
  }

  // Map of holiday dates YYYY-MM-DD
  const holidayDateSet = new Set<string>();
  holidays.forEach(h => {
    const dStr = toLocalDateStr(h.date);
    if (dStr) holidayDateSet.add(dStr);
  });

  // Batch fetch Attendances and approved Leaves for all users in the month
  const userIds = users.map(u => u.id);
  const [allAttendances, allLeaves] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        organizationId: req.user.organizationId,
        userId: { in: userIds },
        date: { gte: queryStart, lte: queryEnd }
      }
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: req.user.organizationId,
        userId: { in: userIds },
        status: 'approved',
        OR: [
          { startDate: { lte: queryEnd }, endDate: { gte: queryStart } }
        ]
      }
    })
  ]);

  // Index attendances by userId -> (dateStr -> Attendance)
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

  // Index leaves by userId -> LeaveRequest[]
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
      lateDeductionPerMinute = 0
    } = user.salaryConfig;

    // Parse allowances
    const parsedAllowances: any = typeof allowances === 'string' ? JSON.parse(allowances) : (allowances || {});
    let allowancesTotal = 0;
    if (Array.isArray(parsedAllowances)) {
      parsedAllowances.forEach((a: any) => allowancesTotal += Number(a.amount || 0));
    } else {
      Object.values(parsedAllowances).forEach((v: any) => allowancesTotal += Number(v || 0));
    }

    const fixedMonthlyGross = basicSalary + allowancesTotal;
    const perDaySalary = totalDaysInMonth > 0 ? fixedMonthlyGross / totalDaysInMonth : 0;

    // Parse deductions base
    const parsedDeductions: any = typeof deductions === 'string' ? JSON.parse(deductions) : (deductions || {});

    // Check joining date
    const joinDateStr = toLocalDateStr(user.employeeProfile?.joinDate);

    const userAttMap = userAttendancesMap.get(user.id) || new Map<string, any>();
    const userLeaves = userLeavesMap.get(user.id) || [];

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let smartLateDeductions = 0;
    let preJoiningDays = 0;

    // Track whether employee has any actual punch or approved leave in this month
    const hasAnyPunchesOrLeaves = userAttMap.size > 0 || userLeaves.length > 0;

    // Iterate through every single calendar day of the month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(Date.UTC(year, m - 1, day, 0, 0, 0, 0));
      const dayStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

      // 1. If employee joined mid-month after this day
      if (joinDateStr && dayStr < joinDateStr) {
        absentDays += 1;
        preJoiningDays += 1;
        continue;
      }

      // 2. Is Holiday? (Company public holiday = paid non-working day)
      if (holidayDateSet.has(dayStr)) {
        continue;
      }

      // 3. Is Weekly Off? (e.g. Sunday = paid non-working day)
      if (!workingDays.includes(dayOfWeek)) {
        continue;
      }

      // 4. Scheduled Working Day:
      const att = userAttMap.get(dayStr);
      const matchingLeave = userLeaves.find(l => {
        const startStr = toLocalDateStr(l.startDate);
        const endStr = toLocalDateStr(l.endDate);
        return dayStr >= startStr && dayStr <= endStr;
      });

      if (att) {
        if (att.status === 'present' || att.status === 'late') {
          presentDays += 1;
          if (att.status === 'late' || att.isLate) {
            lateDays += 1;
            const mins = att.lateMinutes || 0;
            totalLateMinutes += mins;
            if (att.lateDeductionAmount && att.lateDeductionAmount > 0) {
              smartLateDeductions += att.lateDeductionAmount;
            } else if (isSmart) {
              const perMin = Number(lateDeductionPerMinute) || latePolicyDeductionPerMinute;
              if (perMin > 0 && mins > 0) {
                smartLateDeductions += mins * perMin;
              }
            }
          }
        } else if (att.status === 'half_day' || att.isHalfDay) {
          halfDays += 1;
          presentDays += 0.5;
          absentDays += 0.5;
        } else if (att.status === 'leave') {
          if (matchingLeave && matchingLeave.type === 'unpaid') {
            unpaidLeaveDays += 1;
            absentDays += 1;
          } else {
            paidLeaveDays += 1;
          }
        } else if (att.status === 'absent') {
          absentDays += 1;
        }
      } else if (matchingLeave && dayStr <= todayStr) {
        if (matchingLeave.type === 'unpaid') {
          unpaidLeaveDays += 1;
          absentDays += 1;
        } else if (matchingLeave.isHalfDay) {
          halfDays += 1;
          paidLeaveDays += 0.5;
          absentDays += 0.5;
        } else {
          paidLeaveDays += 1;
        }
      } else {
        // Scheduled working day with neither punch nor approved leave (or future unworked day)
        absentDays += 1;
      }
    }

    // Determine payable days & Loss of Pay (LOP) strictly from actual days attended + approved paid leave so far
    let payableDays = 0;
    let lopDeduction = 0;

    if (presentDays === 0 && paidLeaveDays === 0 && halfDays === 0) {
      // Zero attendance in the entire month -> 0 payable days and 100% LOP
      payableDays = 0;
      absentDays = totalDaysInMonth;
      lopDeduction = fixedMonthlyGross;
    } else {
      payableDays = Math.min(totalDaysInMonth, Math.max(0, parseFloat((presentDays + paidLeaveDays).toFixed(1))));
      absentDays = Math.max(0, parseFloat((totalDaysInMonth - payableDays).toFixed(1)));
      const earnedGross = Math.round(perDaySalary * payableDays);
      lopDeduction = Math.max(0, Math.min(fixedMonthlyGross, fixedMonthlyGross - earnedGross));
    }

    // Build final deductions object/array
    let finalDeductions: any;
    if (Array.isArray(parsedDeductions)) {
      finalDeductions = parsedDeductions.filter((d: any) =>
        d.name !== 'Loss of Pay (Absenteeism)' &&
        d.name !== 'Late Arrival Penalty' &&
        d.name !== 'Late Deduction (Attendance)'
      );
      if (lopDeduction > 0) {
        finalDeductions.push({ name: 'Loss of Pay (Absenteeism)', amount: lopDeduction });
      }
      if (isSmart && smartLateDeductions > 0) {
        finalDeductions.push({ name: 'Late Arrival Penalty', amount: Math.round(smartLateDeductions) });
      }
    } else {
      finalDeductions = { ...parsedDeductions };
      delete finalDeductions.loss_of_pay;
      delete finalDeductions.late_arrival;
      delete finalDeductions.late_deduction;
      if (lopDeduction > 0) {
        finalDeductions.loss_of_pay = lopDeduction;
      }
      if (isSmart && smartLateDeductions > 0) {
        finalDeductions.late_arrival = Math.round(smartLateDeductions);
      }
    }

    // Total deductions
    let deductionsTotal = Number(professionalTax || 0) + Number(labourWelfareFund || 0) + Number(tds || 0);
    if (Array.isArray(finalDeductions)) {
      finalDeductions.forEach((d: any) => deductionsTotal += Number(d.amount || 0));
    } else {
      Object.values(finalDeductions).forEach((v: any) => deductionsTotal += Number(v || 0));
    }

    const grossSalary = fixedMonthlyGross;
    const netSalary = Math.max(0, grossSalary - deductionsTotal);

    // Human-readable remarks
    let remarks = '';
    if (payableDays === 0) {
      remarks = `No attendance recorded (0 working days). Full Loss of Pay: -₹${lopDeduction.toLocaleString('en-IN')}`;
    } else {
      const parts = [`Att: ${presentDays}P, ${absentDays}A`];
      if (halfDays > 0) parts.push(`${halfDays}HD`);
      if (paidLeaveDays > 0) parts.push(`${paidLeaveDays}L`);
      if (lateDays > 0) parts.push(`${lateDays}Late (${totalLateMinutes}m)`);

      let summary = parts.join(', ');
      summary += ` | Payable: ${payableDays}/${totalDaysInMonth} days`;
      if (lopDeduction > 0) summary += ` | LOP: -₹${lopDeduction.toLocaleString('en-IN')}`;
      if (isSmart && smartLateDeductions > 0) summary += ` | Late: -₹${Math.round(smartLateDeductions).toLocaleString('en-IN')}`;
      if (lopDeduction === 0 && smartLateDeductions === 0) summary += ` (Full attendance)`;
      if (preJoiningDays > 0) summary += ` (Joined: ${joinDateStr})`;
      remarks = summary;
    }

    try {
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month: {
            employeeId: user.id,
            month: month
          }
        },
        update: {
          basicSalary,
          allowances: parsedAllowances,
          deductions: finalDeductions,
          professionalTax: Number(professionalTax || 0),
          labourWelfareFund: Number(labourWelfareFund || 0),
          tds: Number(tds || 0),
          grossSalary,
          netSalary,
          remarks
        },
        create: {
          organizationId: req.user.organizationId,
          employeeId: user.id,
          month: month,
          basicSalary,
          allowances: parsedAllowances,
          deductions: finalDeductions,
          professionalTax: Number(professionalTax || 0),
          labourWelfareFund: Number(labourWelfareFund || 0),
          tds: Number(tds || 0),
          grossSalary,
          netSalary,
          status: 'draft',
          remarks
        }
      });
      generated.push(payroll);
    } catch (err: any) {
      errors.push(`Failed to generate for ${user.name}: ${err.message}`);
    }
  }

  // Sync totalAmount on any existing non-completed PayrollBatches for this month
  try {
    const batches = await prisma.payrollBatch.findMany({
      where: {
        organizationId: req.user.organizationId,
        month: month,
        status: { not: 'completed' }
      }
    });
    for (const batch of batches) {
      if (batch.payrollIds && batch.payrollIds.length > 0) {
        const batchPayrolls = await prisma.payroll.findMany({
          where: { id: { in: batch.payrollIds } },
          select: { netSalary: true }
        });
        const newTotal = batchPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        await prisma.payrollBatch.update({
          where: { id: batch.id },
          data: { totalAmount: newTotal }
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
      organizationId: req.user.organizationId
    }
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
      status: 'pending_finance_approval'
    }
  });

  await prisma.payroll.updateMany({
    where: { id: { in: payrollIds } },
    data: {
      status: 'transferred_to_finance',
      transferredToFinanceBy: req.user.id,
      transferredToFinanceAt: new Date()
    }
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
      rejector: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
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
      rejector: { select: { id: true, name: true, email: true } }
    }
  });

  if (!batch) {
    res.status(404).json({ success: false, message: 'Payroll batch not found' });
    return;
  }

  // Load individual payroll details in this batch
  let payrolls: any[] = [];
  if (batch.payrollIds && batch.payrollIds.length > 0) {
    payrolls = await prisma.payroll.findMany({
      where: { id: { in: batch.payrollIds } },
      include: {
        user: { select: { id: true, name: true, email: true, designation: true } }
      }
    });
  }

  const formatted = {
    ...batch,
    transferredBy: batch.transferer || (batch.transferredBy ? { name: batch.transferredBy } : undefined),
    approvedBy: batch.approver || (batch.approvedBy ? { name: batch.approvedBy } : undefined),
    rejectedBy: batch.rejector || (batch.rejectedBy ? { name: batch.rejectedBy } : undefined),
    payrolls: payrolls.map(p => ({
      ...p,
      employeeId: {
        id: p.user?.id || p.employeeId,
        name: p.user?.name || 'Employee',
        email: p.user?.email || '',
        designation: p.user?.designation || '',
      }
    }))
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
      remarks: req.body.remarks || batch.remarks
    }
  });

  // Stamp finance approval on individual payrolls
  if (batch.payrollIds && batch.payrollIds.length > 0) {
    await prisma.payroll.updateMany({
      where: { id: { in: batch.payrollIds } },
      data: {
        financeApprovedBy: req.user.id,
        financeApprovedAt: new Date()
      }
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
      rejectionReason: reason
    }
  });

  // Revert payrolls back to confirmed so HR can adjust or re-batch
  if (batch.payrollIds && batch.payrollIds.length > 0) {
    await prisma.payroll.updateMany({
      where: { id: { in: batch.payrollIds } },
      data: {
        status: 'confirmed',
        remarks: `Batch rejected by Finance: ${reason}`
      }
    });
  }

  res.status(200).json({ success: true, data: updatedBatch });
});

export const markBatchPaymentInProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batch = await prisma.payrollBatch.update({
    where: { id: req.params.id },
    data: { status: 'payment_in_progress' }
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
      completedAt: new Date()
    }
  });

  // Mark all individual payrolls as paid with payment details
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
        paymentReference: req.body.paymentReference || null
      }
    });
  }

  res.status(200).json({ success: true, data: updatedBatch });
});
