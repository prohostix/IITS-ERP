// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { syncApprovedLeaveToAttendance } from './hrController.js';

const DEFAULT_HR_SETTINGS = {
  officeHours: {
    checkInTime: '09:00',
    checkOutTime: '18:00',
    graceMinutes: 15,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    breakDurationMinutes: 60,
    dayOverrides: [],
    sandwichRuleEnabled: false,
  },
  latePolicy: {
    maxLateMinutesPerMonth: 60,
    warningThreshold: 45,
    deductionPerExtraMinute: 0,
    deductMode: 'beyond_grace', // 'beyond_grace' | 'from_start'
    lateCountForHalfDay: 0,     // 0 = disabled, e.g. 3 = every 3 lates -> 0.5 day LOP
  },
  lateDeductionRules: [],
  leaveCarryForwardRules: [
    { leaveType: 'casual', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'sick', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'earned', enabled: true, maxDays: 15, monthlyCarryForward: true },
    { leaveType: 'compensatory', enabled: true, maxDays: 5, monthlyCarryForward: true },
  ],
  location: {
    officeLatitude: 28.6139,
    officeLongitude: 77.2090,
    allowedRadius: 100,
    requireLocationForCheckIn: true,
  },
  locations: [],
  requireLocation: true,
  requireLocationForCheckIn: true,
  biometric: {
    enabled: false,
    deviceType: 'none',
    apiEndpoint: '',
    apiKey: '',
    syncInterval: 5,
    fallbackToManual: true,
  },
};

function parseJsonObj(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

/**
 * Returns UTC midnight Date corresponding to the current calendar day in IST (UTC+5:30).
 */
export function getIstTodayUtcMidnight(now: Date = new Date()): Date {
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));
}

function parseTimeMinutes(timeStr: string | null | undefined, defaultH: number, defaultM = 0): number {
  if (!timeStr || typeof timeStr !== 'string') return defaultH * 60 + defaultM;
  const [h, m] = timeStr.split(':').map(Number);
  return (Number.isFinite(h) ? h : defaultH) * 60 + (Number.isFinite(m) ? m : defaultM);
}

export async function evaluateLateFromCheckIn(
  organizationId: string | null | undefined,
  userId: string,
  targetDate: Date,
  checkIn: Date | null,
  rawStatus?: string,
  rawIsLate?: boolean,
  rawLateMinutes?: number
): Promise<{
  status: string;
  isLate: boolean;
  lateMinutes: number;
  deductibleMinutes: number;
  graceMinutes: number;
  lateDeductionAmount: number;
  lateDeductionEnabled: boolean;
}> {
  let status = rawStatus || 'present';
  let isLate = rawIsLate !== undefined ? Boolean(rawIsLate) : status === 'late';
  let lateMinutes = Number(rawLateMinutes) || 0;

  if (!checkIn || isNaN(checkIn.getTime()) || ['absent', 'leave'].includes(status)) {
    return {
      status,
      isLate: false,
      lateMinutes: 0,
      deductibleMinutes: 0,
      graceMinutes: 15,
      lateDeductionAmount: 0,
      lateDeductionEnabled: true,
    };
  }

  const [hrSettings, employee, salaryConfig] = await Promise.all([
    organizationId ? prisma.hRSettings.findFirst({ where: { organizationId } }) : Promise.resolve(null),
    prisma.employeeProfile.findUnique({ where: { userId }, include: { shift: true } }),
    prisma.salaryConfig.findUnique({ where: { userId } }),
  ]);

  const lateDeductionEnabled =
    (salaryConfig?.lateDeductionEnabled ?? employee?.lateDeductionEnabled ?? true) !== false;

  // Open Shift: flexible hours — never mark late or deduct
  if (employee?.shift?.isOpenShift) {
    return {
      status: status === 'late' && rawStatus !== 'late' ? 'present' : status,
      isLate: false,
      lateMinutes: 0,
      deductibleMinutes: 0,
      graceMinutes: Number(employee.shift.graceTimeMinutes ?? 0),
      lateDeductionAmount: 0,
      lateDeductionEnabled,
    };
  }

  const oh = parseJsonObj(hrSettings?.officeHours, DEFAULT_HR_SETTINGS.officeHours);
  const lp = parseJsonObj(hrSettings?.latePolicy, DEFAULT_HR_SETTINGS.latePolicy);
  const rules = parseJsonObj(hrSettings?.lateDeductionRules, []);

  const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

  let expTimeStr = '09:00';
  let expOutStr = '18:00';
  let graceMinutes = 15;
  let breakMins = Number(oh?.breakDurationMinutes ?? 60) || 0;

  // Precedence: 1) Employee's assigned Shift -> 2) Org HRSettings (with day override) -> 3) Default 09:00 / 15m
  if (employee?.shift && employee.shift.startTime) {
    expTimeStr = employee.shift.startTime;
    expOutStr = employee.shift.endTime || oh?.checkOutTime || '18:00';
    graceMinutes = Math.max(0, Number(employee.shift.graceTimeMinutes ?? 15));
  } else if (oh) {
    if (oh.checkInTime) expTimeStr = oh.checkInTime;
    if (oh.checkOutTime) expOutStr = oh.checkOutTime;
    if (oh.graceMinutes !== undefined) graceMinutes = Math.max(0, Number(oh.graceMinutes) || 0);
    if (Array.isArray(oh.dayOverrides)) {
      const ov = oh.dayOverrides.find((o: any) => o?.day === dayOfWeek);
      if (ov?.checkInTime) expTimeStr = ov.checkInTime;
      if (ov?.checkOutTime) expOutStr = ov.checkOutTime;
      if (ov?.breakDurationMinutes !== undefined) breakMins = Number(ov.breakDurationMinutes) || 0;
    }
  }

  if (status === 'half_day') {
    return {
      status,
      isLate: false,
      lateMinutes: 0,
      deductibleMinutes: 0,
      graceMinutes,
      lateDeductionAmount: 0,
      lateDeductionEnabled,
    };
  }

  const expectedMins = parseTimeMinutes(expTimeStr, 9, 0);
  const expectedOutMins = parseTimeMinutes(expOutStr, 18, 0);
  const netShiftMins = Math.max(240, expectedOutMins - expectedMins - breakMins);

  // Convert checkIn timestamp to IST (UTC+5:30)
  const istCheckIn = new Date(checkIn.getTime() + 5.5 * 60 * 60 * 1000);
  const checkInMins = istCheckIn.getUTCHours() * 60 + istCheckIn.getUTCMinutes();
  const diffMins = checkInMins - expectedMins;

  let deductibleMinutes = 0;
  let lateDeductionAmount = 0;

  if (diffMins > graceMinutes) {
    isLate = true;
    lateMinutes = diffMins;
    deductibleMinutes = lp?.deductMode === 'from_start' ? diffMins : Math.max(0, diffMins - graceMinutes);
    if (status === 'present') {
      status = 'late';
    }
  } else if (rawLateMinutes !== undefined && Number(rawLateMinutes) > graceMinutes) {
    isLate = true;
    lateMinutes = Number(rawLateMinutes);
    deductibleMinutes = lp?.deductMode === 'from_start' ? lateMinutes : Math.max(0, lateMinutes - graceMinutes);
    if (status === 'present') {
      status = 'late';
    }
  } else {
    isLate = false;
    lateMinutes = 0;
    deductibleMinutes = 0;
    if (status === 'late' && rawStatus !== 'late') {
      status = 'present';
    }
  }

  if (isLate && lateDeductionEnabled && deductibleMinutes > 0) {
    // Compute monthly gross & per-day salary for pro-rata or slab deduction
    let monthlyGross = 0;
    if (salaryConfig) {
      const basic = Number(salaryConfig.basicSalary) || 0;
      let allowTotal = 0;
      const al = salaryConfig.allowances as any;
      if (Array.isArray(al)) {
        allowTotal = al.reduce((s: number, a: any) => s + (Number(a?.amount) || 0), 0);
      } else if (al && typeof al === 'object') {
        allowTotal = Object.values(al).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      }
      monthlyGross = basic + allowTotal;
    } else if (employee?.ctc) {
      monthlyGross = Number(employee.ctc) / 12;
    } else if (employee?.basicSalary) {
      monthlyGross = Number(employee.basicSalary);
    }

    const daysInMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)).getUTCDate() || 30;
    const perDaySalary = monthlyGross > 0 ? monthlyGross / daysInMonth : 0;

    // Check custom slab rules first if configured
    let matchedSlab: any = null;
    if (Array.isArray(rules) && rules.length > 0) {
      matchedSlab = rules.find((r: any) => {
        const minM = Number(r.minMinutes ?? 0);
        const maxM = r.maxMinutes !== undefined && r.maxMinutes !== null && r.maxMinutes !== '' ? Number(r.maxMinutes) : Infinity;
        return lateMinutes >= minM && lateMinutes <= maxM;
      });
    }

    if (matchedSlab) {
      if (matchedSlab.deductionType === 'half_day') {
        lateDeductionAmount = perDaySalary * 0.5;
      } else if (matchedSlab.deductionType === 'full_day') {
        lateDeductionAmount = perDaySalary;
      } else if (matchedSlab.deductionType === 'fixed') {
        lateDeductionAmount = Number(matchedSlab.amount) || 0;
      }
    } else {
      const empPerMin = Number(salaryConfig?.lateDeductionPerMinute) || 0;
      const policyPerMin = Number(lp?.deductionPerExtraMinute) || 0;
      const perMinRate =
        empPerMin > 0
          ? empPerMin
          : policyPerMin > 0
          ? policyPerMin
          : perDaySalary > 0
          ? perDaySalary / netShiftMins
          : 0;
      lateDeductionAmount = deductibleMinutes * perMinRate;
    }

    lateDeductionAmount = Math.max(0, Math.round(lateDeductionAmount * 100) / 100);
  }

  return {
    status,
    isLate,
    lateMinutes,
    deductibleMinutes,
    graceMinutes,
    lateDeductionAmount,
    lateDeductionEnabled,
  };
}

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isWFH = false, isHalfDay = false, latitude, longitude, address, checkInLocation } = req.body;
  const today = getIstTodayUtcMidnight();
  const checkInTime = new Date();

  const evaluated = await evaluateLateFromCheckIn(
    req.user.organizationId,
    req.user.id,
    today,
    checkInTime,
    isHalfDay ? 'half_day' : 'present'
  );

  const status = isHalfDay ? 'half_day' : evaluated.status;
  const locationPayload =
    checkInLocation ||
    (latitude !== undefined && longitude !== undefined
      ? { latitude: Number(latitude), longitude: Number(longitude), address: address || null }
      : undefined);

  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId: req.user.id, date: today } },
    update: {
      checkIn: checkInTime,
      status: status as any,
      isLate: evaluated.isLate,
      lateMinutes: evaluated.lateMinutes,
      lateDeductionAmount: evaluated.lateDeductionAmount,
      isWFH: Boolean(isWFH),
      isHalfDay: Boolean(isHalfDay),
      ...(locationPayload ? { checkInLocation: locationPayload } : {}),
    },
    create: {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      date: today,
      checkIn: checkInTime,
      status: status as any,
      isLate: evaluated.isLate,
      lateMinutes: evaluated.lateMinutes,
      lateDeductionAmount: evaluated.lateDeductionAmount,
      isWFH: Boolean(isWFH),
      isHalfDay: Boolean(isHalfDay),
      ...(locationPayload ? { checkInLocation: locationPayload } : {}),
    },
  });
  res.status(201).json({ success: true, data: attendance });
});

export const punchOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, address, checkOutLocation } = req.body || {};
  const today = getIstTodayUtcMidnight();
  const localToday = new Date();
  localToday.setHours(0, 0, 0, 0);

  let existing = await prisma.attendance.findFirst({
    where: { userId: req.user.id, date: today },
  });
  if (!existing) {
    existing = await prisma.attendance.findFirst({
      where: { userId: req.user.id, date: localToday },
    });
  }

  if (!existing || !existing.checkIn) {
    return res.status(400).json({ success: false, message: 'No check-in found for today' });
  }

  const checkOutTime = new Date();
  const diffHours = Math.max(0, parseFloat(((checkOutTime.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2)));
  const locationPayload =
    checkOutLocation ||
    (latitude !== undefined && longitude !== undefined
      ? { latitude: Number(latitude), longitude: Number(longitude), address: address || null }
      : undefined);

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: checkOutTime,
      workingHours: diffHours,
      ...(locationPayload ? { checkOutLocation: locationPayload } : {}),
    },
  });
  res.json({ success: true, data: attendance });
});

export const getTodayAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = getIstTodayUtcMidnight();
  const localToday = new Date();
  localToday.setHours(0, 0, 0, 0);

  let attendance = await prisma.attendance.findFirst({ where: { userId: req.user.id, date: today } });
  if (!attendance) {
    attendance = await prisma.attendance.findFirst({ where: { userId: req.user.id, date: localToday } });
  }
  res.json({ success: true, data: attendance });
});

export const getMonthlyLateSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || (req.query.employeeId as string) || req.user.id;
  const monthStr = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [y, m] = monthStr.split('-').map(Number);
  const year = y || new Date().getFullYear();
  const mon = m || new Date().getMonth() + 1;

  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

  const [records, hrSettings, profile, salaryConfig] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        userId: targetUserId,
        date: { gte: start, lte: end },
        OR: [{ isLate: true }, { status: 'late' }, { lateMinutes: { gt: 0 } }],
      },
      orderBy: { date: 'asc' },
    }),
    req.user.organizationId
      ? prisma.hRSettings.findFirst({ where: { organizationId: req.user.organizationId } })
      : Promise.resolve(null),
    prisma.employeeProfile.findUnique({ where: { userId: targetUserId }, include: { shift: true } }),
    prisma.salaryConfig.findUnique({ where: { userId: targetUserId } }),
  ]);

  const lp = parseJsonObj(hrSettings?.latePolicy, DEFAULT_HR_SETTINGS.latePolicy);
  const oh = parseJsonObj(hrSettings?.officeHours, DEFAULT_HR_SETTINGS.officeHours);
  const graceMinutes =
    profile?.shift && !profile.shift.isOpenShift
      ? Number(profile.shift.graceTimeMinutes ?? 15)
      : Number(oh?.graceMinutes ?? 15);
  const lateDeductionEnabled =
    (salaryConfig?.lateDeductionEnabled ?? profile?.lateDeductionEnabled ?? true) !== false;

  const totalLateDays = records.length;
  const totalLateMinutes = records.reduce((s, r) => s + (Number(r.lateMinutes) || 0), 0);
  const totalDeductibleMinutes = records.reduce(
    (s, r) =>
      s +
      (lp?.deductMode === 'from_start'
        ? Number(r.lateMinutes) || 0
        : Math.max(0, (Number(r.lateMinutes) || 0) - graceMinutes)),
    0
  );
  const totalLateDeductionAmount = lateDeductionEnabled
    ? Math.round(records.reduce((s, r) => s + (Number(r.lateDeductionAmount) || 0), 0) * 100) / 100
    : 0;

  res.json({
    success: true,
    data: {
      month: monthStr,
      userId: targetUserId,
      totalLateDays,
      totalLateMinutes,
      totalDeductibleMinutes,
      graceMinutes,
      maxLateMinutesPerMonth: Number(lp?.maxLateMinutesPerMonth ?? 60),
      warningThreshold: Number(lp?.warningThreshold ?? 45),
      lateDeductionEnabled,
      totalLateDeductionAmount,
      records,
    },
  });
});

export const getAttendances = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, userId, startDate, endDate, date, includeResigned } = req.query;
  const where: any = {};
  if (req.user.organizationId) {
    where.organizationId = req.user.organizationId;
  }

  const targetUser = userId || employeeId;
  if (targetUser && targetUser !== 'all') {
    where.userId = targetUser as string;
  } else if (includeResigned !== 'true') {
    where.user = { status: { not: 'resigned' } };
  }

  if (date) {
    const d = new Date(date as string);
    if (!isNaN(d.getTime())) {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    }
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const sd = new Date(startDate as string);
      if (!isNaN(sd.getTime())) {
        where.date.gte = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 0, 0, 0, 0));
      }
    }
    if (endDate) {
      const ed = new Date(endDate as string);
      if (!isNaN(ed.getTime())) {
        where.date.lte = new Date(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate(), 23, 59, 59, 999));
      }
    }
  }

  try {
    const leaveWhere: any = {
      ...(req.user.organizationId ? { organizationId: req.user.organizationId } : {}),
      status: 'approved',
    };
    if (targetUser && targetUser !== 'all') {
      leaveWhere.userId = targetUser as string;
    }
    if (where.date?.gte) {
      leaveWhere.endDate = { gte: where.date.gte };
    }
    if (where.date?.lte) {
      leaveWhere.startDate = { lte: where.date.lte };
    }
    const approvedLeaves = await prisma.leaveRequest.findMany({ where: leaveWhere });
    for (const lr of approvedLeaves) {
      await syncApprovedLeaveToAttendance(lr);
    }
  } catch (e) {
    console.error('Failed to auto-sync approved leaves in getAttendances:', e);
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          role: true,
          department: { select: { id: true, name: true } },
          employeeProfileDetail: { select: { shiftId: true, shift: true, lateDeductionEnabled: true } },
          salaryConfig: { select: { lateDeductionEnabled: true, lateDeductionPerMinute: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
  });
  const mapped = attendances.map((a) => ({
    ...a,
    employeeId: a.user
      ? {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          designation: a.user.designation,
          shift: a.user.employeeProfileDetail?.shift || null,
          lateDeductionEnabled:
            (a.user.salaryConfig?.lateDeductionEnabled ??
              a.user.employeeProfileDetail?.lateDeductionEnabled ??
              true) !== false,
        }
      : null,
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getAttendance = getAttendances;

export const getAttendanceById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  const formatted = {
    ...attendance,
    employeeId: attendance.user
      ? {
          id: attendance.user.id,
          name: attendance.user.name,
          email: attendance.user.email,
          designation: attendance.user.designation,
        }
      : null,
  };
  res.json({ success: true, data: formatted });
});

export const createAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawUserId = req.body.userId || req.body.employeeId;
  const targetUserId = typeof rawUserId === 'object' && rawUserId !== null ? rawUserId.id : rawUserId;

  if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.trim()) {
    return res.status(400).json({ success: false, message: 'Please select an employee' });
  }

  if (!req.body.date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }

  let finalUserId = targetUserId.trim();
  const orgId = req.user.organizationId;

  let user = await prisma.user.findFirst({
    where: { id: finalUserId, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!user) {
    const empProfile = await prisma.employeeProfile.findFirst({
      where: { id: finalUserId, ...(orgId ? { organizationId: orgId } : {}) },
    });
    if (empProfile?.userId) {
      finalUserId = empProfile.userId;
      user = await prisma.user.findUnique({ where: { id: finalUserId } });
    } else {
      const anyUser = await prisma.user.findUnique({ where: { id: finalUserId } });
      if (anyUser) {
        finalUserId = anyUser.id;
        user = anyUser;
      } else {
        return res.status(404).json({ success: false, message: 'Employee user not found' });
      }
    }
  }

  const d = new Date(req.body.date);
  if (isNaN(d.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date provided' });
  }

  const todayMidnight = getIstTodayUtcMidnight();
  const todayEnd = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
  const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  if (targetDate.getTime() > todayEnd.getTime()) {
    return res.status(400).json({ success: false, message: 'Attendance cannot be marked for a future date' });
  }

  let checkIn = req.body.checkIn ? new Date(req.body.checkIn) : null;
  let checkOut = req.body.checkOut ? new Date(req.body.checkOut) : null;

  if (req.body.status === 'absent' || req.body.status === 'leave') {
    checkIn = null;
    checkOut = null;
  } else if (checkIn && checkOut && !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime()) && checkOut.getTime() <= checkIn.getTime()) {
    const istOut = new Date(checkOut.getTime() + 5.5 * 60 * 60 * 1000);
    const outHour = istOut.getUTCHours();
    if (outHour >= 1 && outHour <= 8) {
      checkOut = new Date(checkOut.getTime() + 12 * 3600 * 1000);
    }
  }

  let workingHours = Number(req.body.workingHours) || 0;
  if (checkIn && checkOut && !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
    const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    workingHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
  } else if (req.body.status === 'absent' || req.body.status === 'leave') {
    workingHours = 0;
  }

  const resolvedOrgId = user?.organizationId || req.user.organizationId;

  const evaluated = await evaluateLateFromCheckIn(
    resolvedOrgId,
    finalUserId,
    targetDate,
    checkIn && !isNaN(checkIn.getTime()) ? checkIn : null,
    req.body.status,
    req.body.isLate,
    req.body.lateMinutes
  );

  const status = evaluated.status;
  const isLate = evaluated.isLate;
  const isHalfDay = req.body.isHalfDay !== undefined ? Boolean(req.body.isHalfDay) : status === 'half_day';
  const isWFH = Boolean(req.body.isWFH);
  const lateMinutes = evaluated.lateMinutes;
  const lateDeductionAmount =
    req.body.lateDeductionAmount !== undefined
      ? Number(req.body.lateDeductionAmount) || 0
      : evaluated.lateDeductionAmount;
  const notes = req.body.notes !== undefined ? (req.body.notes ? String(req.body.notes) : null) : null;

  const data = {
    userId: finalUserId,
    organizationId: resolvedOrgId,
    date: targetDate,
    status: status as any,
    checkIn: checkIn && !isNaN(checkIn.getTime()) ? checkIn : null,
    checkOut: checkOut && !isNaN(checkOut.getTime()) ? checkOut : null,
    workingHours,
    isLate,
    lateMinutes,
    lateDeductionAmount,
    isHalfDay,
    isWFH,
    notes,
  };

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: finalUserId,
        date: targetDate,
      },
    },
    update: {
      status: data.status,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      workingHours: data.workingHours,
      isLate: data.isLate,
      lateMinutes: data.lateMinutes,
      lateDeductionAmount: data.lateDeductionAmount,
      isHalfDay: data.isHalfDay,
      isWFH: data.isWFH,
      notes: data.notes,
      organizationId: data.organizationId,
    },
    create: data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
        },
      },
    },
  });

  const formatted = {
    ...attendance,
    employeeId: attendance.user
      ? {
          id: attendance.user.id,
          name: attendance.user.name,
          email: attendance.user.email,
          designation: attendance.user.designation,
        }
      : null,
  };

  res.status(201).json({ success: true, data: formatted });
});
export const markAttendance = createAttendance;

export const updateAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  const updateData: any = {};
  if (req.body.date) {
    const d = new Date(req.body.date);
    const todayMidnight = getIstTodayUtcMidnight();
    const todayEnd = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
    const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    if (targetDate.getTime() > todayEnd.getTime()) {
      return res.status(400).json({ success: false, message: 'Attendance cannot be marked for a future date' });
    }
    updateData.date = targetDate;
  }
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes ? String(req.body.notes) : null;
  if (req.body.checkIn !== undefined) updateData.checkIn = req.body.checkIn ? new Date(req.body.checkIn) : null;
  if (req.body.checkOut !== undefined) updateData.checkOut = req.body.checkOut ? new Date(req.body.checkOut) : null;
  if (req.body.isHalfDay !== undefined) updateData.isHalfDay = Boolean(req.body.isHalfDay);
  if (req.body.isWFH !== undefined) updateData.isWFH = Boolean(req.body.isWFH);

  if (req.body.status && req.body.isHalfDay === undefined) {
    updateData.isHalfDay = req.body.status === 'half_day';
  }

  let finalCheckIn = updateData.checkIn !== undefined ? updateData.checkIn : attendance.checkIn;
  let finalCheckOut = updateData.checkOut !== undefined ? updateData.checkOut : attendance.checkOut;
  const finalDate = updateData.date || attendance.date;
  const finalStatus = updateData.status !== undefined ? updateData.status : attendance.status;

  if (finalStatus === 'absent' || finalStatus === 'leave') {
    finalCheckIn = null;
    finalCheckOut = null;
    updateData.checkIn = null;
    updateData.checkOut = null;
  } else if (finalCheckIn && finalCheckOut && !isNaN(finalCheckIn.getTime()) && !isNaN(finalCheckOut.getTime()) && finalCheckOut.getTime() <= finalCheckIn.getTime()) {
    const istOut = new Date(finalCheckOut.getTime() + 5.5 * 60 * 60 * 1000);
    const outHour = istOut.getUTCHours();
    if (outHour >= 1 && outHour <= 8) {
      finalCheckOut = new Date(finalCheckOut.getTime() + 12 * 3600 * 1000);
      updateData.checkOut = finalCheckOut;
    }
  }

  const evaluated = await evaluateLateFromCheckIn(
    attendance.organizationId || req.user.organizationId,
    attendance.userId,
    finalDate,
    finalCheckIn && !isNaN(finalCheckIn.getTime()) ? finalCheckIn : null,
    finalStatus,
    req.body.isLate,
    req.body.lateMinutes
  );

  updateData.status = evaluated.status;
  updateData.isLate = evaluated.isLate;
  updateData.lateMinutes = evaluated.lateMinutes;
  updateData.lateDeductionAmount =
    req.body.lateDeductionAmount !== undefined
      ? Number(req.body.lateDeductionAmount) || 0
      : evaluated.lateDeductionAmount;

  if (finalStatus === 'absent' || finalStatus === 'leave') {
    updateData.workingHours = 0;
  } else if (finalCheckIn && finalCheckOut && !isNaN(finalCheckIn.getTime()) && !isNaN(finalCheckOut.getTime())) {
    const diffHours = (finalCheckOut.getTime() - finalCheckIn.getTime()) / (1000 * 60 * 60);
    updateData.workingHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
  } else if (req.body.workingHours !== undefined) {
    updateData.workingHours = Number(req.body.workingHours) || 0;
  }

  const updatedAttendance = await prisma.attendance.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
        },
      },
    },
  });

  const formatted = {
    ...updatedAttendance,
    employeeId: updatedAttendance.user
      ? {
          id: updatedAttendance.user.id,
          name: updatedAttendance.user.name,
          email: updatedAttendance.user.email,
          designation: updatedAttendance.user.designation,
        }
      : null,
  };

  res.json({ success: true, data: formatted });
});

export const deleteAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  await prisma.attendance.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Attendance deleted successfully', data: {} });
});

async function resolveOrganizationId(req: AuthRequest): Promise<string | null> {
  if (req.user?.organizationId) return req.user.organizationId;
  if (req.body?.organizationId) return req.body.organizationId;
  const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
  return firstOrg?.id || null;
}

export const getHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return res.json({ success: true, data: DEFAULT_HR_SETTINGS });
  }
  const settings = await prisma.hRSettings.findFirst({ where: { organizationId } });
  if (!settings) {
    return res.json({ success: true, data: { ...DEFAULT_HR_SETTINGS, organizationId } });
  }

  const merged = {
    ...settings,
    officeHours: {
      ...DEFAULT_HR_SETTINGS.officeHours,
      ...parseJsonObj(settings.officeHours, {}),
    },
    latePolicy: {
      ...DEFAULT_HR_SETTINGS.latePolicy,
      ...parseJsonObj(settings.latePolicy, {}),
    },
    lateDeductionRules: Array.isArray(parseJsonObj(settings.lateDeductionRules, []))
      ? parseJsonObj(settings.lateDeductionRules, [])
      : [],
    leaveCarryForwardRules: Array.isArray(parseJsonObj(settings.leaveCarryForwardRules, null))
      ? parseJsonObj(settings.leaveCarryForwardRules, DEFAULT_HR_SETTINGS.leaveCarryForwardRules)
      : DEFAULT_HR_SETTINGS.leaveCarryForwardRules,
    location: {
      ...DEFAULT_HR_SETTINGS.location,
      ...parseJsonObj(settings.location, {}),
    },
    locations: Array.isArray(parseJsonObj(settings.locations, []))
      ? parseJsonObj(settings.locations, [])
      : [],
    biometric: {
      ...DEFAULT_HR_SETTINGS.biometric,
      ...parseJsonObj(settings.biometric, {}),
    },
  };

  res.json({ success: true, data: merged });
});

export const createOrUpdateHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization not found for settings.' });
  }

  const existing = await prisma.hRSettings.findUnique({ where: { organizationId } });

  const updatePayload: Record<string, any> = {};
  if (req.body.officeHours !== undefined) {
    updatePayload.officeHours = {
      ...DEFAULT_HR_SETTINGS.officeHours,
      ...(existing ? parseJsonObj(existing.officeHours, {}) : {}),
      ...parseJsonObj(req.body.officeHours, {}),
    };
  }
  if (req.body.latePolicy !== undefined) {
    updatePayload.latePolicy = {
      ...DEFAULT_HR_SETTINGS.latePolicy,
      ...(existing ? parseJsonObj(existing.latePolicy, {}) : {}),
      ...parseJsonObj(req.body.latePolicy, {}),
    };
  }
  if (req.body.lateDeductionRules !== undefined) {
    const r = parseJsonObj(req.body.lateDeductionRules, []);
    updatePayload.lateDeductionRules = Array.isArray(r) ? r : [];
  }
  if (req.body.leaveCarryForwardRules !== undefined) {
    const r = parseJsonObj(req.body.leaveCarryForwardRules, []);
    updatePayload.leaveCarryForwardRules = Array.isArray(r) ? r : DEFAULT_HR_SETTINGS.leaveCarryForwardRules;
  }
  if (req.body.location !== undefined) {
    updatePayload.location = {
      ...DEFAULT_HR_SETTINGS.location,
      ...(existing ? parseJsonObj(existing.location, {}) : {}),
      ...parseJsonObj(req.body.location, {}),
    };
  }
  if (req.body.locations !== undefined) {
    const locs = parseJsonObj(req.body.locations, []);
    updatePayload.locations = Array.isArray(locs) ? locs : [];
  }
  if (req.body.requireLocation !== undefined) {
    updatePayload.requireLocation = Boolean(req.body.requireLocation);
  }
  if (req.body.requireLocationForCheckIn !== undefined) {
    updatePayload.requireLocationForCheckIn = Boolean(req.body.requireLocationForCheckIn);
    updatePayload.requireLocation = Boolean(req.body.requireLocationForCheckIn);
  }
  if (req.body.biometric !== undefined) {
    updatePayload.biometric = {
      ...DEFAULT_HR_SETTINGS.biometric,
      ...(existing ? parseJsonObj(existing.biometric, {}) : {}),
      ...parseJsonObj(req.body.biometric, {}),
    };
  }

  const createPayload = {
    organizationId,
    officeHours: updatePayload.officeHours || DEFAULT_HR_SETTINGS.officeHours,
    latePolicy: updatePayload.latePolicy || DEFAULT_HR_SETTINGS.latePolicy,
    lateDeductionRules: updatePayload.lateDeductionRules || DEFAULT_HR_SETTINGS.lateDeductionRules,
    leaveCarryForwardRules: updatePayload.leaveCarryForwardRules || DEFAULT_HR_SETTINGS.leaveCarryForwardRules,
    location: updatePayload.location || DEFAULT_HR_SETTINGS.location,
    locations: updatePayload.locations || DEFAULT_HR_SETTINGS.locations,
    requireLocation: updatePayload.requireLocation ?? DEFAULT_HR_SETTINGS.requireLocation,
    requireLocationForCheckIn: updatePayload.requireLocationForCheckIn ?? DEFAULT_HR_SETTINGS.requireLocationForCheckIn,
    biometric: updatePayload.biometric || DEFAULT_HR_SETTINGS.biometric,
  };

  const settings = await prisma.hRSettings.upsert({
    where: { organizationId },
    update: updatePayload,
    create: createPayload,
  });
  res.json({ success: true, data: settings });
});

export const biometricSync = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { records } = req.body || {};
  if (!Array.isArray(records) || records.length === 0) {
    return res.json({ success: true, message: 'Biometric sync triggered (no new records supplied)' });
  }

  let synced = 0;
  for (const rec of records) {
    const empId = rec.employeeId || rec.userId;
    const punchTime = rec.punchTime ? new Date(rec.punchTime) : null;
    if (!empId || !punchTime || isNaN(punchTime.getTime())) continue;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: empId }, { userId: empId }],
        ...(req.user?.organizationId ? { organizationId: req.user.organizationId } : {}),
      },
    });
    if (!user) continue;

    const istDay = getIstTodayUtcMidnight(punchTime);
    if (rec.punchType === 'out') {
      const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId: user.id, date: istDay } },
      });
      if (existing?.checkIn) {
        const hrs = Math.max(0, parseFloat(((punchTime.getTime() - existing.checkIn.getTime()) / 3600000).toFixed(2)));
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkOut: punchTime, workingHours: hrs },
        });
        synced++;
      }
    } else {
      const evaluated = await evaluateLateFromCheckIn(user.organizationId, user.id, istDay, punchTime, 'present');
      await prisma.attendance.upsert({
        where: { userId_date: { userId: user.id, date: istDay } },
        update: {
          checkIn: punchTime,
          status: evaluated.status as any,
          isLate: evaluated.isLate,
          lateMinutes: evaluated.lateMinutes,
          lateDeductionAmount: evaluated.lateDeductionAmount,
        },
        create: {
          userId: user.id,
          organizationId: user.organizationId,
          date: istDay,
          checkIn: punchTime,
          status: evaluated.status as any,
          isLate: evaluated.isLate,
          lateMinutes: evaluated.lateMinutes,
          lateDeductionAmount: evaluated.lateDeductionAmount,
        },
      });
      synced++;
    }
  }

  res.json({ success: true, message: `Biometric sync completed (${synced} punches processed)` });
});

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { date, departmentId } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const userWhere: any = {
      organizationId: req.user.organizationId,
      status: { notIn: ['resigned', 'suspended'] },
      role: { notIn: ['superadmin', 'ceo', 'center_admin', 'student'] },
    };

    if (departmentId && departmentId !== 'all') {
      userWhere.departmentId = departmentId as string;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        avatar: true,
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        attendances: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = users.map((u) => u.id);

    const [tasksCompleted, tasksUpdated, leadsCreated, enrollmentsCreated, auditLogs] = await Promise.all([
      prisma.task.groupBy({
        by: ['assignedTo'],
        where: {
          organizationId: req.user.organizationId,
          assignedTo: { in: userIds },
          completedAt: { gte: startOfDay, lte: endOfDay },
        },
        _count: { id: true },
      }),
      prisma.task.groupBy({
        by: ['assignedTo'],
        where: {
          organizationId: req.user.organizationId,
          assignedTo: { in: userIds },
          updatedAt: { gte: startOfDay, lte: endOfDay },
          status: 'in_progress',
        },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['referredBy'],
        where: {
          organizationId: req.user.organizationId,
          referredBy: { in: userIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _count: { id: true },
      }),
      prisma.enrollment.groupBy({
        by: ['salesUserId'],
        where: {
          organizationId: req.user.organizationId,
          salesUserId: { in: userIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _count: { id: true },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          organizationId: req.user.organizationId,
          userId: { in: userIds },
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
        _count: { id: true },
      }),
    ]);

    const tcMap = new Map(tasksCompleted.map((i) => [i.assignedTo, i._count.id]));
    const tuMap = new Map(tasksUpdated.map((i) => [i.assignedTo, i._count.id]));
    const lcMap = new Map(leadsCreated.map((i) => [i.referredBy, i._count.id]));
    const ecMap = new Map(enrollmentsCreated.map((i) => [i.salesUserId, i._count.id]));
    const alMap = new Map(auditLogs.map((i) => [i.userId, i._count.id]));

    const report = users.map((u) => {
      const att = u.attendances[0] || null;
      const tc = tcMap.get(u.id) || 0;
      const tu = tuMap.get(u.id) || 0;
      const lc = lcMap.get(u.id) || 0;
      const ec = ecMap.get(u.id) || 0;
      const al = alMap.get(u.id) || 0;

      return {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          designation: u.designation,
          avatar: u.avatar,
          department: u.department,
          branch: u.branch,
        },
        attendance: att,
        metrics: {
          tasksCompleted: tc,
          tasksInProgress: tu,
          leadsCreated: lc,
          enrollmentsSubmitted: ec,
          systemActions: al,
          totalActivities: tc + tu + lc + ec + al,
        },
      };
    });

    res.json({ success: true, count: report.length, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate activity report' });
  }
});

export const getMyAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const monthStr = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [y, m] = monthStr.split('-').map(Number);
  const year = y || new Date().getFullYear();
  const mon = m || new Date().getMonth() + 1;
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

  const records = await prisma.attendance.findMany({
    where: { userId: req.user.id, date: { gte: start, lte: end } },
  });

  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late' || r.isLate).length;
  const halfDay = records.filter((r) => r.status === 'half_day' || r.isHalfDay).length;
  const leave = records.filter((r) => r.status === 'leave').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const totalLateMinutes = records.reduce((s, r) => s + (Number(r.lateMinutes) || 0), 0);
  const totalLateDeduction = records.reduce((s, r) => s + (Number(r.lateDeductionAmount) || 0), 0);

  res.json({
    success: true,
    data: { month: monthStr, present, late, halfDay, leave, absent, totalLateMinutes, totalLateDeduction },
  });
});
