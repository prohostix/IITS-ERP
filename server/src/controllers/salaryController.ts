// @ts-nocheck
import { Response } from 'express';
import { AuthRequest, isPayrollAuthorizedUser } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  parseCarryForwardRules,
  buildMonthlyUsageMap,
  computeMonthlyFifoCarryForward,
  countWorkingLeaveDaysInRange,
} from '../utils/leaveBalanceHelper.js';

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const includeResigned = req.query.includeResigned === 'true';
  const where: any = { organizationId: req.user.organizationId };
  if (!includeResigned) {
    where.user = { status: { not: 'resigned' } };
  }
  const configs = await prisma.salaryConfig.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, designation: true, role: true, status: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string;
  const includeResigned = req.query.includeResigned === 'true';
  const where: any = {
    organizationId: req.user.organizationId,
    ...(includeResigned ? {} : { user: { status: { not: 'resigned' } } }),
  };
  if (status && status !== 'all') {
    where.approvalStatus = status;
  } else if (!status) {
    where.approvalStatus = 'pending_approval';
  }
  const configs = await prisma.salaryConfig.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, designation: true, role: true, status: true } } }
  });

  const allConfigs = await prisma.salaryConfig.findMany({
    where: {
      organizationId: req.user.organizationId,
      ...(includeResigned ? {} : { user: { status: { not: 'resigned' } } }),
    }
  });

  const summary = {
    total: allConfigs.length,
    pending: allConfigs.filter(c => c.approvalStatus === 'pending_approval').length,
    approved: allConfigs.filter(c => c.approvalStatus === 'approved').length,
    rejected: allConfigs.filter(c => c.approvalStatus === 'rejected').length,
  };

  res.json({ success: true, count: configs.length, summary, data: configs });
});

export const getSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  res.json({ success: true, data: config });
});

export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { effectiveFrom, basicSalary, allowances, professionalTax, labourWelfareFund, tds } = req.body;

  const targetUser = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Employee user not found.' });
  }

  const salaryData: Record<string, any> = {};
  if (req.body.lateDeductionPerMinute !== undefined) {
    salaryData.lateDeductionPerMinute = Number(req.body.lateDeductionPerMinute) || 0;
  }
  if (req.body.lateDeductionEnabled !== undefined) {
    salaryData.lateDeductionEnabled = Boolean(req.body.lateDeductionEnabled);
  }
  const parsedEffectiveFrom = effectiveFrom && !isNaN(new Date(effectiveFrom).getTime()) ? new Date(effectiveFrom) : null;

  const numBasic = Number(basicSalary) || 0;
  if (numBasic <= 0) {
    return res.status(400).json({ success: false, message: 'Please enter a valid Basic Salary greater than 0.' });
  }

  let totalAllowances = 0;
  if (Array.isArray(allowances)) {
    totalAllowances = allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  } else if (typeof allowances === 'object' && allowances !== null) {
    totalAllowances = Object.values(allowances).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  }

  const grossSalary = numBasic + totalAllowances;
  if (totalAllowances > 0 && numBasic < grossSalary * 0.5) {
    return res.status(400).json({
      success: false,
      message: `Statutory Wage Rule: Basic Salary (₹${numBasic}) must be at least 50% of Gross Salary (₹${grossSalary}). Allowances cannot exceed ₹${numBasic}.`
    });
  }

  const deductions = req.body.deductions ? { ...req.body.deductions } : {};
  if (numBasic <= 15000 && (deductions.pf === undefined || deductions.pf === null || deductions.pf === '')) {
    deductions.pf = Math.round(numBasic * 0.12);
  }
  if (tds !== undefined && tds !== null) {
    delete deductions.tax;
  }

  const autoApprove = isPayrollAuthorizedUser(req.user) || ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  const initialStatus = autoApprove ? 'approved' : 'pending_approval';
  const orgId = targetUser.organizationId || req.user.organizationId;

  const config = await prisma.salaryConfig.upsert({
    where: { userId: req.params.userId },
    update: {
      ...salaryData,
      basicSalary: Number(basicSalary),
      allowances: allowances || {},
      deductions,
      professionalTax: Number(professionalTax || 0),
      labourWelfareFund: Number(labourWelfareFund || 0),
      tds: Number(tds || 0),
      effectiveFrom: parsedEffectiveFrom,
      organizationId: orgId,
      createdBy: req.user.id,
      ...(autoApprove ? { approvalStatus: 'approved', approvedBy: req.user.id, approvedAt: new Date() } : { approvalStatus: 'pending_approval' })
    },
    create: {
      ...salaryData,
      basicSalary: Number(basicSalary),
      allowances: allowances || {},
      deductions,
      professionalTax: Number(professionalTax || 0),
      labourWelfareFund: Number(labourWelfareFund || 0),
      tds: Number(tds || 0),
      effectiveFrom: parsedEffectiveFrom,
      approvalStatus: initialStatus,
      approvedBy: autoApprove ? req.user.id : null,
      approvedAt: autoApprove ? new Date() : null,
      userId: req.params.userId,
      organizationId: orgId,
      createdBy: req.user.id
    }
  });

  if (req.body.lateDeductionEnabled !== undefined && orgId) {
    await prisma.employeeProfile.upsert({
      where: { userId: req.params.userId },
      update: { lateDeductionEnabled: Boolean(req.body.lateDeductionEnabled) },
      create: { userId: req.params.userId, organizationId: orgId, lateDeductionEnabled: Boolean(req.body.lateDeductionEnabled) },
    });
  }

  res.json({ success: true, data: config });
});

export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  await prisma.salaryConfig.delete({ where: { userId: req.params.userId } });
  res.json({ success: true, data: {} });
});

function countWorkingLeaveDaysInYear(lr: any, yearStart: Date, yearEnd: Date, holidayKeySet: Set<string>): number {
  const s = new Date(Math.max(new Date(lr.startDate).getTime(), yearStart.getTime()));
  const e = new Date(Math.min(new Date(lr.endDate).getTime(), yearEnd.getTime()));
  const sDay = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  if (eDay < sDay) return 0;
  if (lr.isHalfDay) return 0.5;

  let days = 0;
  const cur = new Date(sDay);
  while (cur.getTime() <= eDay) {
    const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
    if (cur.getUTCDay() !== 0 && !holidayKeySet.has(k)) {
      days += 1;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export const getLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const rawMonth = req.query.month !== undefined ? Number(req.query.month) : now.getMonth() + 1;
  const month = Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1;
  const monthIdx = month - 1;
  const orgId = req.user.organizationId;

  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [allocations, leaveRequests, holidays, hrSettings] = await Promise.all([
    prisma.leaveAllocation.findMany({
      where: { organizationId: orgId, year, user: { status: { not: 'resigned' } } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            designation: true,
            status: true,
            employeeProfile: { select: { joinDate: true } },
            employeeProfileDetail: { select: { joinDate: true } },
          },
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: orgId,
        status: 'approved',
        startDate: { lte: yearEnd },
        endDate: { gte: yearStart },
      },
    }),
    prisma.holiday.findMany({
      where: { organizationId: orgId, date: { gte: yearStart, lte: yearEnd } },
      select: { date: true },
    }),
    orgId ? prisma.hRSettings.findFirst({ where: { organizationId: orgId } }) : Promise.resolve(null),
  ]);

  const holidayKeySet = new Set(
    holidays.map((h) => {
      const hd = new Date(h.date);
      return `${hd.getUTCFullYear()}-${String(hd.getUTCMonth() + 1).padStart(2, '0')}-${String(hd.getUTCDate()).padStart(2, '0')}`;
    })
  );

  let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (hrSettings?.officeHours) {
    const oh: any = typeof hrSettings.officeHours === 'string'
      ? JSON.parse(hrSettings.officeHours)
      : hrSettings.officeHours;
    if (Array.isArray(oh?.workingDays) && oh.workingDays.length > 0) {
      workingDays = oh.workingDays;
    }
  }
  const cfRules = parseCarryForwardRules(hrSettings?.leaveCarryForwardRules);

  const data = allocations.map((alloc) => {
    const userLeaves = leaveRequests.filter((lr) => lr.userId === alloc.userId);
    const rawJoin = alloc.user?.employeeProfileDetail?.joinDate || alloc.user?.employeeProfile?.joinDate;
    let accrualStartMonth = 0;
    if (rawJoin) {
      const jd = new Date(rawJoin);
      if (!isNaN(jd.getTime())) {
        if (jd.getUTCFullYear() === year) accrualStartMonth = jd.getUTCMonth();
        else if (jd.getUTCFullYear() > year) accrualStartMonth = 12;
      }
    }

    const computeType = (typeKey: string, baseVal: number) => {
      const isMonthly = baseVal > 0 && baseVal <= 4;
      const usedByMonth = buildMonthlyUsageMap(userLeaves, year, typeKey, workingDays, holidayKeySet, true);
      const usedInMonth = usedByMonth[monthIdx] || 0;
      const usedInYear = userLeaves
        .filter((lr) => lr.type === typeKey)
        .reduce((s, lr) => s + countWorkingLeaveDaysInRange(lr, yearStart, yearEnd, workingDays, holidayKeySet), 0);

      if (isMonthly) {
        const rule = cfRules.find((r) => r.leaveType === typeKey);
        const fifo = computeMonthlyFifoCarryForward({
          monthlyQuota: baseVal,
          targetMonthIdx: monthIdx,
          accrualStartMonth,
          usedByMonth,
          rule,
        });
        return {
          isMonthly: true,
          effectiveTotal: fifo.effectiveAllocated,
          carriedForward: fifo.carriedForward,
          expired: fifo.expiredTotal,
          expiringEndOfMonth: fifo.expiringEndOfMonth,
          used: usedInMonth,
          usedYear: usedInYear,
        };
      }

      return {
        isMonthly: false,
        effectiveTotal: baseVal,
        carriedForward: 0,
        expired: 0,
        expiringEndOfMonth: 0,
        used: usedInYear,
        usedYear: usedInYear,
      };
    };

    const sick = computeType('sick', alloc.sickLeave);
    const casual = computeType('casual', alloc.casualLeave);
    const earned = computeType('earned', alloc.earnedLeave);
    const comp = computeType('compensatory', alloc.complementaryLeave);

    return {
      ...alloc,
      month,
      usedSick: sick.used,
      usedCasual: casual.used,
      usedEarned: earned.used,
      usedComplementary: comp.used,
      monthlyBreakdown: {
        sick,
        casual,
        earned,
        compensatory: comp,
      },
    };
  });

  res.json({
    success: true,
    count: data.length,
    year,
    month,
    carryForwardRules: cfRules,
    data,
  });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocation = await prisma.leaveAllocation.findUnique({
    where: { userId_year: { userId: req.params.userId, year } }
  });
  res.json({ success: true, data: allocation });
});

export const upsertLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.body.year) || new Date().getFullYear();
  const targetUser = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, organizationId: true } });
  const orgId = targetUser?.organizationId || req.user.organizationId;

  const cleanData = {
    sickLeave: Math.max(0, Math.round(Number(req.body.sickLeave ?? 1))),
    casualLeave: Math.max(0, Math.round(Number(req.body.casualLeave ?? 1))),
    earnedLeave: Math.max(0, Math.round(Number(req.body.earnedLeave ?? 1))),
    complementaryLeave: Math.max(0, Math.round(Number(req.body.complementaryLeave ?? 0))),
  };

  const allocation = await prisma.leaveAllocation.upsert({
    where: { userId_year: { userId: req.params.userId, year } },
    update: { ...cleanData, createdBy: req.user.id },
    create: {
      ...cleanData,
      userId: req.params.userId,
      organizationId: orgId,
      year,
      createdBy: req.user.id,
    }
  });
  res.json({ success: true, data: allocation });
});

export const bulkInitLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    year = new Date().getFullYear(),
    casualLeave = 1,
    sickLeave = 1,
    earnedLeave = 1,
    complementaryLeave = 0,
    overwrite = false,
  } = req.body;
  const targetYear = Number(year) || new Date().getFullYear();
  const casualNum = Math.max(0, Math.round(Number(casualLeave) || 0));
  const sickNum = Math.max(0, Math.round(Number(sickLeave) || 0));
  const earnedNum = Math.max(0, Math.round(Number(earnedLeave) || 0));
  const compNum = Math.max(0, Math.round(Number(complementaryLeave) || 0));

  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: 'active' as any,
      role: {
        notIn: ['ceo', 'org_admin', 'superadmin', 'center_admin', 'student']
      }
    }
  });

  const existingAllocations = await prisma.leaveAllocation.findMany({
    where: { organizationId: req.user.organizationId, year: targetYear },
    select: { userId: true },
  });
  const existingSet = new Set(existingAllocations.map((a) => a.userId));

  const targetUsers = overwrite ? users : users.filter((u) => !existingSet.has(u.id));

  const results = await Promise.all(
    targetUsers.map((u) =>
      prisma.leaveAllocation.upsert({
        where: { userId_year: { userId: u.id, year: targetYear } },
        update: {
          casualLeave: casualNum,
          sickLeave: sickNum,
          earnedLeave: earnedNum,
          complementaryLeave: compNum,
        },
        create: {
          userId: u.id,
          organizationId: req.user.organizationId,
          year: targetYear,
          casualLeave: casualNum,
          sickLeave: sickNum,
          earnedLeave: earnedNum,
          complementaryLeave: compNum,
          createdBy: req.user.id,
        },
      })
    )
  );

  res.json({
    success: true,
    message:
      results.length > 0
        ? `Initialized leave allocations for ${results.length} employee(s) for ${targetYear}`
        : `All ${users.length} active employees already have leave allocations for ${targetYear}`,
  });
});

// Carry Forward Unused Leaves from Previous Year -> Target Year
export const carryForwardLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const toYear = Number(req.body.toYear || req.body.year) || new Date().getFullYear();
  const fromYear = Number(req.body.fromYear) || toYear - 1;

  if (fromYear >= toYear) {
    return res.status(400).json({ success: false, message: 'Source year must be earlier than target year.' });
  }

  // Persist custom carry-forward rules if submitted
  let hrSettings = await prisma.hRSettings.findUnique({ where: { organizationId: orgId } });
  let rules: any[] = [
    { leaveType: 'casual', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'sick', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'earned', enabled: true, maxDays: 15, monthlyCarryForward: true },
    { leaveType: 'compensatory', enabled: true, maxDays: 5, monthlyCarryForward: true },
  ];

  if (Array.isArray(req.body.rules) && req.body.rules.length > 0) {
    rules = req.body.rules;
    if (hrSettings) {
      hrSettings = await prisma.hRSettings.update({
        where: { organizationId: orgId },
        data: { leaveCarryForwardRules: rules },
      });
    }
  } else if (hrSettings?.leaveCarryForwardRules && Array.isArray(hrSettings.leaveCarryForwardRules) && (hrSettings.leaveCarryForwardRules as any[]).length > 0) {
    rules = hrSettings.leaveCarryForwardRules as any[];
  }

  const baseSick = Math.max(0, Math.round(Number(req.body.baseSickLeave ?? 12)));
  const baseCasual = Math.max(0, Math.round(Number(req.body.baseCasualLeave ?? 12)));
  const baseEarned = Math.max(0, Math.round(Number(req.body.baseEarnedLeave ?? 15)));
  const baseComp = Math.max(0, Math.round(Number(req.body.baseComplementaryLeave ?? 0)));

  const fromStart = new Date(Date.UTC(fromYear, 0, 1, 0, 0, 0, 0));
  const fromEnd = new Date(Date.UTC(fromYear, 11, 31, 23, 59, 59, 999));

  const [users, prevAllocs, prevLeaves, prevHolidays, currentAllocs] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        status: 'active' as any,
        role: { notIn: ['ceo', 'org_admin', 'superadmin', 'center_admin', 'student'] },
      },
      select: { id: true, name: true },
    }),
    prisma.leaveAllocation.findMany({ where: { organizationId: orgId, year: fromYear } }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: orgId,
        status: 'approved',
        startDate: { lte: fromEnd },
        endDate: { gte: fromStart },
      },
    }),
    prisma.holiday.findMany({
      where: { organizationId: orgId, date: { gte: fromStart, lte: fromEnd } },
      select: { date: true },
    }),
    prisma.leaveAllocation.findMany({ where: { organizationId: orgId, year: toYear } }),
  ]);

  const holidayKeySet = new Set(
    prevHolidays.map(h => {
      const hd = new Date(h.date);
      return `${hd.getUTCFullYear()}-${String(hd.getUTCMonth() + 1).padStart(2, '0')}-${String(hd.getUTCDate()).padStart(2, '0')}`;
    })
  );

  const prevAllocMap = new Map(prevAllocs.map(a => [a.userId, a]));
  const currAllocMap = new Map(currentAllocs.map(a => [a.userId, a]));

  const getRule = (type: string) => rules.find((r: any) => r.leaveType === type);

  let updatedCount = 0;
  let totalCarriedDays = 0;

  for (const u of users) {
    const prev = prevAllocMap.get(u.id);
    if (!prev) continue;

    const uLeaves = prevLeaves.filter(lr => lr.userId === u.id);
    let usedSick = 0, usedCasual = 0, usedEarned = 0, usedComp = 0;
    for (const lr of uLeaves) {
      const d = countWorkingLeaveDaysInYear(lr, fromStart, fromEnd, holidayKeySet);
      if (lr.type === 'sick') usedSick += d;
      else if (lr.type === 'casual') usedCasual += d;
      else if (lr.type === 'earned') usedEarned += d;
      else if (lr.type === 'compensatory') usedComp += d;
    }

    const calcCarry = (type: string, prevVal: number, usedVal: number) => {
      const r = getRule(type);
      if (!r || r.enabled === false) return 0;
      const annual = prevVal > 0 && prevVal <= 4 ? prevVal * 12 : prevVal;
      const unused = Math.max(0, Math.floor(annual - usedVal));
      return Math.min(unused, Math.max(0, Number(r.maxDays ?? 0)));
    };

    const cfSick = calcCarry('sick', prev.sickLeave, usedSick);
    const cfCasual = calcCarry('casual', prev.casualLeave, usedCasual);
    const cfEarned = calcCarry('earned', prev.earnedLeave, usedEarned);
    const cfComp = calcCarry('compensatory', prev.complementaryLeave, usedComp);

    const curr = currAllocMap.get(u.id);
    const targetBaseSick = curr ? (curr.sickLeave <= baseSick ? curr.sickLeave : baseSick) : baseSick;
    const targetBaseCasual = curr ? (curr.casualLeave <= baseCasual ? curr.casualLeave : baseCasual) : baseCasual;
    const targetBaseEarned = curr ? (curr.earnedLeave <= baseEarned ? curr.earnedLeave : baseEarned) : baseEarned;
    const targetBaseComp = curr ? (curr.complementaryLeave <= baseComp ? curr.complementaryLeave : baseComp) : baseComp;

    const newSick = targetBaseSick + cfSick;
    const newCasual = targetBaseCasual + cfCasual;
    const newEarned = targetBaseEarned + cfEarned;
    const newComp = targetBaseComp + cfComp;

    await prisma.leaveAllocation.upsert({
      where: { userId_year: { userId: u.id, year: toYear } },
      update: {
        sickLeave: newSick,
        casualLeave: newCasual,
        earnedLeave: newEarned,
        complementaryLeave: newComp,
      },
      create: {
        userId: u.id,
        organizationId: orgId,
        year: toYear,
        sickLeave: newSick,
        casualLeave: newCasual,
        earnedLeave: newEarned,
        complementaryLeave: newComp,
        createdBy: req.user.id,
      },
    });

    updatedCount++;
    totalCarriedDays += cfSick + cfCasual + cfEarned + cfComp;
  }

  res.json({
    success: true,
    updatedCount,
    totalCarriedDays,
    message:
      updatedCount > 0
        ? `Carried forward ${totalCarriedDays} unused leave day(s) from ${fromYear} to ${toYear} across ${updatedCount} employee(s).`
        : `No ${fromYear} leave allocation records found to carry forward into ${toYear}.`,
  });
});

export { generateSmartPayroll } from './payrollController.js';

export const approveSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const config = await prisma.salaryConfig.findUnique({ where: { id: req.params.id } });
  if (!config) {
    return res.status(404).json({ success: false, message: 'Salary config not found' });
  }

  const updated = await prisma.salaryConfig.update({
    where: { id: req.params.id },
    data: {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      rejectedRemarks: action === 'reject' ? remarks : null,
    }
  });
  res.json({ success: true, data: updated });
});
