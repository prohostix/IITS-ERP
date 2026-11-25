// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureOpenPositionInHierarchy } from './orgAdminController.js';
import { emitToUser } from '../config/socket.js';

function parseCarryForwardRules(raw: any) {
  const defaults = [
    { leaveType: 'casual', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'sick', enabled: true, maxDays: 6, monthlyCarryForward: true },
    { leaveType: 'earned', enabled: true, maxDays: 15, monthlyCarryForward: true },
    { leaveType: 'compensatory', enabled: true, maxDays: 5, monthlyCarryForward: true },
  ];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return defaults;
  return defaults.map((def) => {
    const found = parsed.find((r: any) => r?.leaveType === def.leaveType);
    return found ? { ...def, ...found } : def;
  });
}

async function resolveLeaveStakeholders(organizationId: string, employeeUserId: string) {
  const employee = await prisma.user.findUnique({
    where: { id: employeeUserId },
    include: {
      department: { include: { assistantManagers: { select: { id: true } } } },
      subDepartment: { select: { id: true, managerId: true } },
      branch: { select: { id: true, branchManagerId: true } },
      designationRef: { select: { id: true, parentDesignationId: true } },
    },
  });

  const managerIds = new Set<string>();
  if (employee) {
    if (employee.reportingTo) managerIds.add(employee.reportingTo);
    if (employee.subDepartment?.managerId) managerIds.add(employee.subDepartment.managerId);
    if (employee.department?.managerId) managerIds.add(employee.department.managerId);
    if (Array.isArray(employee.department?.assistantManagers)) {
      for (const am of employee.department.assistantManagers) {
        if (am?.id) managerIds.add(am.id);
      }
    }
    if (employee.branch?.branchManagerId) {
      managerIds.add(employee.branch.branchManagerId);
    }
    if (employee.designationRef?.parentDesignationId) {
      const parentHolders = await prisma.user.findMany({
        where: {
          organizationId,
          designationId: employee.designationRef.parentDesignationId,
          status: 'active',
        },
        select: { id: true },
      });
      for (const ph of parentHolders) {
        managerIds.add(ph.id);
      }
    }
  }
  managerIds.delete(employeeUserId);

  const hrUsers = await prisma.user.findMany({
    where: {
      organizationId,
      status: 'active',
      OR: [
        { role: { in: ['hr_admin', 'hr_sub_admin'] } },
        { department: { type: 'hr' } },
      ],
    },
    select: { id: true },
  });
  const hrIds = new Set<string>(hrUsers.map((u) => u.id));
  hrIds.delete(employeeUserId);

  return { employee, managerIds: Array.from(managerIds), hrIds: Array.from(hrIds) };
}

async function sendLeaveNotification(params: {
  organizationId: string;
  recipientIds: string[];
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'medium' | 'high';
}) {
  const uniqueIds = Array.from(new Set(params.recipientIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const notif = await prisma.notification.create({
          data: {
            organizationId: params.organizationId,
            userId: uid,
            title: params.title,
            message: params.message,
            type: 'leave' as any,
            priority: (params.priority || 'high') as any,
            link: params.link || 'leave_approvals',
          },
        });
        emitToUser(uid, 'notification', notif);
      } catch (err) {
        console.error('Failed to send leave notification to', uid, err);
      }
    })
  );
}

const mapLeaveRequest = (leave: any) => ({
  ...leave,
  employeeId: leave.user ? {
    id: leave.userId,
    name: leave.user.name,
    email: leave.user.email,
    designation: leave.user.designation
  } : null,
  departmentId: leave.department ? {
    id: leave.departmentId,
    name: leave.department.name
  } : null,
  deptApprovedBy: leave.deptApprover ? { name: leave.deptApprover.name } : null,
  hrApprovedBy: leave.hrApprover ? { name: leave.hrApprover.name } : null,
});

export async function syncApprovedLeaveToAttendance(leave: {
  id?: string;
  userId: string;
  organizationId: string;
  type: string;
  reason?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  isHalfDay?: boolean | null;
}) {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 0, 0, 0, 0));
  const typeLabel = leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : 'Approved';
  const noteText = leave.isHalfDay
    ? `Half Day (${typeLabel} Leave)${leave.reason ? ': ' + leave.reason : ''}`
    : `${typeLabel} Leave (Approved)${leave.reason ? ': ' + leave.reason : ''}`;

  // Fetch organization holidays in range so Sundays and Holidays are never marked as 'leave'
  const holidaysInRange = await prisma.holiday.findMany({
    where: {
      organizationId: leave.organizationId,
      date: {
        gte: cur,
        lte: new Date(last.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    },
    select: { date: true }
  });
  const holidayDates = new Set(
    holidaysInRange.map(h => {
      const hd = new Date(h.date);
      return `${hd.getUTCFullYear()}-${String(hd.getUTCMonth() + 1).padStart(2, '0')}-${String(hd.getUTCDate()).padStart(2, '0')}`;
    })
  );

  while (cur.getTime() <= last.getTime()) {
    const dayDate = new Date(cur.getTime());
    const dateKey = `${dayDate.getUTCFullYear()}-${String(dayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dayDate.getUTCDate()).padStart(2, '0')}`;
    const isSunday = dayDate.getUTCDay() === 0;
    const isHoliday = holidayDates.has(dateKey);

    if (isSunday || isHoliday) {
      // Do not mark Sundays or multi-day span Holidays as 'leave'; if a synthetic leave row without checkIn exists on Sunday or a multi-day span Holiday, remove it
      const isMultiDay = last.getTime() > cur.getTime();
      if (isSunday || (isMultiDay && isHoliday)) {
        await prisma.attendance.deleteMany({
          where: {
            userId: leave.userId,
            date: dayDate,
            status: 'leave' as any,
            checkIn: null
          }
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
        continue;
      }
    }

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: leave.userId, date: dayDate } }
    });

    if (leave.isHalfDay) {
      await prisma.attendance.upsert({
        where: { userId_date: { userId: leave.userId, date: dayDate } },
        update: {
          status: 'half_day' as any,
          isHalfDay: true,
          notes: existing?.notes || noteText,
        },
        create: {
          userId: leave.userId,
          organizationId: leave.organizationId,
          date: dayDate,
          status: 'half_day' as any,
          isHalfDay: true,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          isLate: false,
          lateMinutes: 0,
          notes: noteText,
        }
      });
    } else {
      // Only overwrite if no punch exists or if existing record was marked absent/leave
      const hasRealPunch = existing && existing.checkIn && !['absent', 'leave'].includes(existing.status);
      if (!hasRealPunch) {
        await prisma.attendance.upsert({
          where: { userId_date: { userId: leave.userId, date: dayDate } },
          update: {
            status: 'leave' as any,
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            isLate: false,
            lateMinutes: 0,
            isHalfDay: false,
            notes: noteText,
          },
          create: {
            userId: leave.userId,
            organizationId: leave.organizationId,
            date: dayDate,
            status: 'leave' as any,
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            isLate: false,
            lateMinutes: 0,
            isHalfDay: false,
            notes: noteText,
          }
        });
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

export async function computeUserLeaveBalance(userId: string, organizationId: string, refDate?: Date) {
  const now = refDate || new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [hrSettings, empProfile] = await Promise.all([
    organizationId ? prisma.hRSettings.findFirst({ where: { organizationId } }) : Promise.resolve(null),
    prisma.employeeProfile.findUnique({ where: { userId }, select: { joinDate: true } }),
  ]);
  const cfRules = parseCarryForwardRules(hrSettings?.leaveCarryForwardRules);

  let allocation = await prisma.leaveAllocation.findUnique({
    where: { userId_year: { userId, year } }
  });

  if (!allocation) {
    // Check previous year allocation to apply year-to-year carry-forward automatically
    const prevYear = year - 1;
    const prevAllocation = await prisma.leaveAllocation.findUnique({
      where: { userId_year: { userId, year: prevYear } },
    });

    let initSick = 12;
    let initCasual = 12;
    let initEarned = 15;
    let initComp = 0;

    if (prevAllocation) {
      const prevStart = new Date(Date.UTC(prevYear, 0, 1, 0, 0, 0, 0));
      const prevEnd = new Date(Date.UTC(prevYear, 11, 31, 23, 59, 59, 999));
      const prevLeaves = await prisma.leaveRequest.findMany({
        where: {
          userId,
          status: 'approved',
          startDate: { lte: prevEnd },
          endDate: { gte: prevStart },
        },
      });
      const countSimple = (t: string) =>
        prevLeaves
          .filter((l) => l.type === t)
          .reduce((acc, l) => {
            if (l.isHalfDay) return acc + 0.5;
            const s = Math.max(new Date(l.startDate).getTime(), prevStart.getTime());
            const e = Math.min(new Date(l.endDate).getTime(), prevEnd.getTime());
            return acc + Math.max(0, Math.round((e - s) / 86400000) + 1);
          }, 0);

      const getCfAdd = (typeKey: string, prevAllocVal: number) => {
        const rule = cfRules.find((r: any) => r.leaveType === typeKey);
        if (!rule || rule.enabled === false) return 0;
        // If prevAllocVal <= 4 it was a monthly quota (annualized = prevAllocVal * 12)
        const annualTotal = prevAllocVal <= 4 ? prevAllocVal * 12 : prevAllocVal;
        const unused = Math.max(0, Math.floor(annualTotal - countSimple(typeKey)));
        return Math.min(unused, Math.max(0, Number(rule.maxDays ?? 0)));
      };

      const baseSick = prevAllocation.sickLeave <= 4 ? prevAllocation.sickLeave : 12;
      const baseCasual = prevAllocation.casualLeave <= 4 ? prevAllocation.casualLeave : 12;
      const baseEarned = prevAllocation.earnedLeave || 15;

      initSick = baseSick + (baseSick <= 4 ? 0 : getCfAdd('sick', prevAllocation.sickLeave));
      initCasual = baseCasual + (baseCasual <= 4 ? 0 : getCfAdd('casual', prevAllocation.casualLeave));
      initEarned = baseEarned + getCfAdd('earned', prevAllocation.earnedLeave);
      initComp = getCfAdd('compensatory', prevAllocation.complementaryLeave);
    }

    allocation = await prisma.leaveAllocation.create({
      data: {
        userId,
        organizationId,
        year,
        sickLeave: initSick,
        casualLeave: initCasual,
        earnedLeave: initEarned,
        complementaryLeave: initComp,
      }
    });
  }

  const [leaves, orgHolidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: ['pending', 'dept_approved', 'approved'] },
        startDate: { lte: yearEnd },
        endDate: { gte: yearStart }
      }
    }),
    prisma.holiday.findMany({
      where: {
        organizationId,
        date: { gte: yearStart, lte: yearEnd }
      },
      select: { date: true }
    })
  ]);

  const holidayKeySet = new Set(
    orgHolidays.map(h => {
      const hd = new Date(h.date);
      return `${hd.getUTCFullYear()}-${String(hd.getUTCMonth() + 1).padStart(2, '0')}-${String(hd.getUTCDate()).padStart(2, '0')}`;
    })
  );

  let orgWorkingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (hrSettings?.officeHours) {
    const oh: any = typeof hrSettings.officeHours === 'string'
      ? JSON.parse(hrSettings.officeHours)
      : hrSettings.officeHours;
    if (Array.isArray(oh?.workingDays) && oh.workingDays.length > 0) {
      orgWorkingDays = oh.workingDays;
    }
  }

  const countDaysInRange = (lr: any, rangeStart: Date, rangeEnd: Date) => {
    const s = new Date(Math.max(new Date(lr.startDate).getTime(), rangeStart.getTime()));
    const e = new Date(Math.min(new Date(lr.endDate).getTime(), rangeEnd.getTime()));
    const sDay = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    if (eDay < sDay) return 0;
    if (lr.isHalfDay) return 0.5;

    let workingLeaveDays = 0;
    const cur = new Date(sDay);
    while (cur.getTime() <= eDay) {
      const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
      const dow = cur.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const isWorkingDay = orgWorkingDays.includes(dow);
      const isHol = holidayKeySet.has(k);
      if (isWorkingDay && !isHol) {
        workingLeaveDays += 1;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return workingLeaveDays;
  };

  // Determine start month in current year for monthly carry-forward accrual
  let accrualStartMonth = 0;
  if (empProfile?.joinDate) {
    const jd = new Date(empProfile.joinDate);
    if (!isNaN(jd.getTime()) && jd.getUTCFullYear() === year) {
      accrualStartMonth = jd.getUTCMonth();
    } else if (!isNaN(jd.getTime()) && jd.getUTCFullYear() > year) {
      accrualStartMonth = 12;
    }
  }

  const priorMonthsEnd = month > 0 ? new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)) : null;

  const buildTypeBalance = (typeKey: string, allocatedVal: number) => {
    let usedThisMonth = 0;
    let pendingThisMonth = 0;
    let usedThisYear = 0;
    let pendingThisYear = 0;
    let usedPriorMonths = 0;

    for (const lr of leaves) {
      if (lr.type !== typeKey) continue;
      const mDays = countDaysInRange(lr, monthStart, monthEnd);
      const yDays = countDaysInRange(lr, yearStart, yearEnd);
      const pDays = priorMonthsEnd ? countDaysInRange(lr, yearStart, priorMonthsEnd) : 0;
      if (lr.status === 'approved') {
        usedThisMonth += mDays;
        usedThisYear += yDays;
        usedPriorMonths += pDays;
      } else {
        pendingThisMonth += mDays;
        pendingThisYear += yDays;
      }
    }

    const rule = cfRules.find((r: any) => r.leaveType === typeKey);
    const isMonthlyQuota = allocatedVal > 0 && allocatedVal <= 4;
    let effectiveAllocated = allocatedVal;
    let carriedForward = 0;

    if (isMonthlyQuota && rule?.monthlyCarryForward !== false && month > accrualStartMonth) {
      const priorElapsedMonths = Math.max(0, month - accrualStartMonth);
      const rawCarried = Math.max(0, priorElapsedMonths * allocatedVal - usedPriorMonths);
      const maxCap = rule?.maxDays !== undefined && Number(rule.maxDays) > 0 ? Number(rule.maxDays) : rawCarried;
      carriedForward = Number(Math.min(rawCarried, maxCap).toFixed(1));
      effectiveAllocated = Number((allocatedVal + carriedForward).toFixed(1));
    }

    const effectiveUsed = isMonthlyQuota ? usedThisMonth : usedThisYear;
    const effectivePending = isMonthlyQuota ? pendingThisMonth : pendingThisYear;
    const availableThisMonth = Math.max(0, Number((effectiveAllocated - effectiveUsed - effectivePending).toFixed(1)));
    const remainingAfterApproved = Math.max(0, Number((effectiveAllocated - effectiveUsed).toFixed(1)));

    return {
      allocated: effectiveAllocated,
      baseAllocated: allocatedVal,
      carriedForward,
      isMonthlyQuota,
      usedThisMonth,
      pendingThisMonth,
      availableThisMonth,
      remainingAfterApproved,
      usedThisYear,
      pendingThisYear,
    };
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    year,
    month: month + 1,
    monthLabel: `${monthNames[month]} ${year}`,
    sick: buildTypeBalance('sick', Number(allocation.sickLeave ?? 12)),
    casual: buildTypeBalance('casual', Number(allocation.casualLeave ?? 12)),
    earned: buildTypeBalance('earned', Number(allocation.earnedLeave ?? 15)),
    compensatory: buildTypeBalance('compensatory', Number(allocation.complementaryLeave ?? 0)),
  };
}

export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isGodMode = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo', 'general_manager', 'project_manager'].includes(req.user.role) ||
    (req.user.role === 'employee' && req.user.department?.type === 'hr');
  const hasDirectSubordinates = Boolean((req.user as any).subordinates?.length > 0);
  const isAssignedDeptManager = Boolean(req.user.department?.managerId === req.user.id) || Boolean((req.user as any).managedDepartments?.length > 0) || Boolean((req.user as any).managedSubDepartments?.length > 0) || Boolean(req.user.isDepartmentManager);
  const isDeptManager = ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance', 'sales_admin', 'sales_sub_admin', 'center_admin', 'branch_manager'].includes(req.user.role) || isAssignedDeptManager || Boolean(req.user.subDepartmentId) || hasDirectSubordinates;
  const whereClause: any = { organizationId: req.user.organizationId };

  // Dept / Reporting managers see their own department's and direct subordinates' leaves
  if (!isGodMode && isDeptManager) {
    let userDeptId = req.user.departmentId || req.user.subDepartment?.parentDeptId;
    const managedIds = ((req.user as any).managedDepartments || []).map((d: any) => d.id);
    if (!userDeptId && managedIds.length > 0) {
      userDeptId = managedIds[0];
    }
    if (!userDeptId) {
      let deptType: string | null = null;
      if (['ops_admin', 'ops_sub_admin'].includes(req.user.role)) deptType = 'operations';
      else if (['finance_admin', 'finance_sub_admin', 'finance'].includes(req.user.role)) deptType = 'finance';
      else if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) deptType = 'sales';

      if (deptType) {
        const dept = await prisma.department.findFirst({
          where: { organizationId: req.user.organizationId, type: deptType }
        });
        if (dept) userDeptId = dept.id;
      }
    }

    const orFilters: any[] = [{ user: { reportingTo: req.user.id } }];
    const allDepts = Array.from(new Set([userDeptId, ...managedIds].filter(Boolean)));
    if (isAssignedDeptManager || ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin'].includes(req.user.role)) {
      if (allDepts.length > 0) {
        orFilters.push({ departmentId: { in: allDepts } });
      }
    }
    if (req.user.branchId && req.user.role === 'branch_manager') {
      orFilters.push({ user: { branchId: req.user.branchId } });
    }
    if (req.user.subDepartmentId && Boolean((req.user as any).managedSubDepartments?.length > 0)) {
      orFilters.push({ user: { subDepartmentId: req.user.subDepartmentId } });
    }
    whereClause.OR = orFilters;
  } else if (!isGodMode && !isDeptManager) {
    whereClause.userId = req.user.id;
  }

  // Support ?status= filter (e.g. status=pending)
  if (req.query.status) {
    whereClause.status = req.query.status;
  }

  // Support ?userId= filter for admin drill-downs
  if (req.query.userId && isGodMode) {
    whereClause.userId = req.query.userId;
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { 
      user: { select: { name: true, email: true, designation: true } },
      department: { select: { name: true } },
      deptApprover: { select: { name: true } },
      hrApprover: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  const mappedLeaves = leaves.map(mapLeaveRequest);
  res.json({ success: true, count: mappedLeaves.length, data: mappedLeaves });
});

export const getLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: leave });
});

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, departmentId, type, isHalfDay, attachmentUrl, reason } = req.body;
  
  let deptId = departmentId || req.user.departmentId;
  if (!deptId) {
    if (req.user.subDepartmentId) {
      const subDept = await prisma.subDepartment.findUnique({
        where: { id: req.user.subDepartmentId },
        select: { parentDeptId: true }
      });
      if (subDept?.parentDeptId) {
        deptId = subDept.parentDeptId;
      }
    }

    if (!deptId) {
      let deptType: string | null = null;
      if (['ops_admin', 'ops_sub_admin', 'operations'].some(r => req.user.role?.includes(r))) deptType = 'operations';
      else if (['finance_admin', 'finance_sub_admin', 'finance', 'accountant'].some(r => req.user.role?.includes(r))) deptType = 'finance';
      else if (['sales_admin', 'sales_sub_admin', 'sales', 'bde', 'telecaller'].some(r => req.user.role?.includes(r))) deptType = 'sales';
      else if (['hr_admin', 'hr_sub_admin', 'hr_executive', 'hr'].some(r => req.user.role?.includes(r))) deptType = 'hr';

      if (deptType) {
        const dept = await prisma.department.findFirst({
          where: { organizationId: req.user.organizationId, type: deptType }
        });
        if (dept) deptId = dept.id;
      }
    }

    if (!deptId) {
      const firstDept = await prisma.department.findFirst({
        where: { organizationId: req.user.organizationId }
      });
      if (firstDept) {
        deptId = firstDept.id;
      } else {
        const defaultDept = await prisma.department.create({
          data: {
            name: 'General',
            organizationId: req.user.organizationId,
            status: 'active'
          }
        });
        deptId = defaultDept.id;
      }
    }
  }

  // Calculate required working days (excluding Sundays & org Holidays)
  const start = new Date(startDate);
  const end = new Date(endDate);
  let requiredDays = 0;
  if (isHalfDay) {
    requiredDays = 0.5;
  } else {
    const sDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const eDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const hols = await prisma.holiday.findMany({
      where: {
        organizationId: req.user.organizationId,
        date: { gte: new Date(sDay), lte: new Date(eDay + 86399999) },
      },
      select: { date: true },
    });
    const holKeys = new Set(
      hols.map((h) => {
        const hd = new Date(h.date);
        return `${hd.getUTCFullYear()}-${String(hd.getUTCMonth() + 1).padStart(2, '0')}-${String(hd.getUTCDate()).padStart(2, '0')}`;
      })
    );
    const cur = new Date(sDay);
    while (cur.getTime() <= eDay) {
      const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
      if (cur.getUTCDay() !== 0 && !holKeys.has(k)) {
        requiredDays += 1;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  // Skip balance check for unpaid and bereavement (or if 0 working days)
  if (type !== 'unpaid' && type !== 'bereavement' && requiredDays > 0) {
    const balanceInfo = await computeUserLeaveBalance(req.user.id, req.user.organizationId, start);
    const typeKey = type as 'sick' | 'casual' | 'earned' | 'compensatory';
    const typeBal = (balanceInfo as any)[typeKey];
    if (typeBal) {
      const allowed = typeBal.allocated;
      const usedAndPending = typeBal.isMonthlyQuota
        ? (typeBal.usedThisMonth + typeBal.pendingThisMonth)
        : (typeBal.usedThisYear + typeBal.pendingThisYear);
      if (usedAndPending + requiredDays > allowed) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${type} leave balance for ${balanceInfo.monthLabel}. Allowed: ${allowed}, Used/Pending: ${usedAndPending}, Requested: ${requiredDays}`
        });
      }
    }
  }

  const leave = await prisma.leaveRequest.create({
    data: { 
      type,
      reason: reason || '',
      isHalfDay: Boolean(isHalfDay),
      attachmentUrl: attachmentUrl || null,
      startDate: start,
      endDate: end,
      userId: req.user.id, 
      organizationId: req.user.organizationId,
      departmentId: deptId,
      status: 'pending'
    }
  });

  // Automatically notify BOTH Reporting Managers AND HR Team
  try {
    const { managerIds, hrIds } = await resolveLeaveStakeholders(req.user.organizationId, req.user.id);
    const dateRangeStr =
      start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10)
        ? start.toISOString().slice(0, 10)
        : `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;
    const allRecipients = Array.from(new Set([...managerIds, ...hrIds]));
    await sendLeaveNotification({
      organizationId: req.user.organizationId,
      recipientIds: allRecipients,
      title: `New Leave Approval Request — ${req.user.name}`,
      message: `${req.user.name} applied for ${isHalfDay ? 'Half-Day ' : ''}${type} leave (${dateRangeStr})${reason ? ': ' + reason : ''}.`,
      link: 'leave_approvals',
      priority: 'high',
    });
  } catch (e) {
    console.error('Failed to notify HR & managers on leave creation:', e);
  }

  res.status(201).json({ success: true, data: leave });
});

export const updateLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  const isAdmin = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo'].includes(req.user.role);
  if (!isAdmin && (existing.userId !== req.user.id || existing.status !== 'pending')) {
    res.status(403).json({ success: false, message: 'You can only edit your own pending leave requests' });
    return;
  }

  const { startDate, endDate, type, reason, isHalfDay, attachmentUrl } = req.body;
  const updateData: any = {};
  
  // Only allow editing fields the employee controls; block status changes via this endpoint
  if (type !== undefined) updateData.type = type;
  if (reason !== undefined) updateData.reason = reason;
  if (isHalfDay !== undefined) updateData.isHalfDay = isHalfDay;
  if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl;
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);

  const leave = await prisma.leaveRequest.update({ 
    where: { id: req.params.id }, 
    data: updateData 
  });
  res.json({ success: true, data: leave });
});

export const deleteLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  const isAdmin = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo'].includes(req.user.role);
  const isOwner = leave.userId === req.user.id;

  // Only the owner can delete their own pending requests; admins can delete any
  if (!isAdmin && (!isOwner || leave.status !== 'pending')) {
    res.status(403).json({ success: false, message: 'You can only withdraw your own pending leave requests' });
    return;
  }

  await prisma.leaveRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const approveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const isHr = req.path.includes('hr-approve') || ['hr_admin', 'hr_sub_admin'].includes(req.user.role) && req.path.includes('hr-approve');

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          branchId: true,
          reportingTo: true,
          subDepartmentId: true,
        },
      },
    },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  // Prevent self-approval: department managers cannot approve their own leaves
  const isGodMode = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'project_manager'].includes(req.user.role);
  if (!isGodMode && existing.userId === req.user.id) {
    res.status(403).json({ 
      success: false, 
      message: 'You cannot approve your own leave request. It must be reviewed by another manager or HR.' 
    });
    return;
  }

  // Verify department / reporting manager's authority
  if (!isHr && !isGodMode && !['hr_admin', 'hr_sub_admin'].includes(req.user.role)) {
    const isDirectReportingMgr = existing.user?.reportingTo === req.user.id;
    const isAssignedDeptManager = Boolean(req.user.department?.managerId === req.user.id) || Boolean((req.user as any).managedDepartments?.length > 0) || Boolean(req.user.isDepartmentManager);
    let userDeptId = req.user.departmentId || req.user.subDepartment?.parentDeptId;
    const managedIds = ((req.user as any).managedDepartments || []).map((d: any) => d.id);
    if (!userDeptId && managedIds.length > 0) {
      userDeptId = managedIds[0];
    }
    if (!userDeptId) {
      let deptType: string | null = null;
      if (['ops_admin', 'ops_sub_admin'].includes(req.user.role)) deptType = 'operations';
      else if (['finance_admin', 'finance_sub_admin', 'finance'].includes(req.user.role)) deptType = 'finance';
      else if (['sales_admin', 'sales_sub_admin'].includes(req.user.role)) deptType = 'sales';

      if (deptType) {
        const dept = await prisma.department.findFirst({
          where: { organizationId: req.user.organizationId, type: deptType }
        });
        if (dept) userDeptId = dept.id;
      }
    }

    const allDepts = Array.from(new Set([userDeptId, ...managedIds].filter(Boolean)));
    const isBranchMatch = Boolean(req.user.branchId && existing.user?.branchId === req.user.branchId);
    const isDeptMatch = Boolean(existing.departmentId && allDepts.includes(existing.departmentId));

    if (!isDirectReportingMgr && !isDeptMatch && !isBranchMatch && !isAssignedDeptManager) {
      res.status(403).json({
        success: false,
        message: 'You can only approve leave requests for your reporting team or department.'
      });
      return;
    }
  }

  const updateData: any = {};
  if (isHr) {
    updateData.status = (action === 'approve' ? 'approved' : 'rejected') as any;
    updateData.hrRemarks = remarks;
    updateData.hrApprovedBy = req.user.id;
  } else {
    updateData.status = (action === 'approve' ? 'dept_approved' : 'rejected') as any;
    updateData.deptAdminRemarks = remarks;
    updateData.deptApprovedBy = req.user.id;
  }

  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: updateData,
    include: { user: { select: { id: true, name: true } } }
  });

  // Automatically sync approved leave dates to the Attendance table so employee shows as 'On Leave' instead of 'Absent'
  if (leave.status === 'approved') {
    try {
      await syncApprovedLeaveToAttendance(leave);
    } catch (err) {
      console.error('Failed to sync approved leave to attendance:', err);
    }
  }

  // Notify Employee + Both HR Team and Reporting Managers
  try {
    const sStr = new Date(leave.startDate).toISOString().slice(0, 10);
    const eStr = new Date(leave.endDate).toISOString().slice(0, 10);
    const dateRangeStr = sStr === eStr ? sStr : `${sStr} to ${eStr}`;
    const empName = leave.user?.name || existing.user?.name || 'Employee';
    const actionLabel = action === 'approve' ? (isHr ? 'fully approved by HR' : 'approved by reporting manager') : 'rejected';

    // 1. Notify requesting employee
    await sendLeaveNotification({
      organizationId: existing.organizationId,
      recipientIds: [leave.userId],
      title: `Leave Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your ${leave.type} leave (${dateRangeStr}) has been ${actionLabel} by ${req.user.name}.${remarks ? ' Remarks: ' + remarks : ''}`,
      link: 'leaves',
      priority: 'medium',
    });

    // 2. Notify HR Team and Reporting Managers
    const { managerIds, hrIds } = await resolveLeaveStakeholders(existing.organizationId, leave.userId);
    const otherStakeholders = Array.from(new Set([...managerIds, ...hrIds])).filter((uid) => uid !== req.user.id);

    if (!isHr && action === 'approve') {
      await sendLeaveNotification({
        organizationId: existing.organizationId,
        recipientIds: otherStakeholders,
        title: `Leave Manager-Approved — ${empName} (Awaiting HR)`,
        message: `${req.user.name} approved ${empName}'s ${leave.type} leave (${dateRangeStr}). Final HR approval is pending.`,
        link: 'leave_approvals',
        priority: 'high',
      });
    } else {
      await sendLeaveNotification({
        organizationId: existing.organizationId,
        recipientIds: otherStakeholders,
        title: `Leave ${action === 'approve' ? 'Approved' : 'Rejected'} — ${empName}`,
        message: `${empName}'s ${leave.type} leave (${dateRangeStr}) was ${action === 'approve' ? 'approved' : 'rejected'} by ${req.user.name}.${remarks ? ' Remarks: ' + remarks : ''}`,
        link: 'leave_approvals',
        priority: 'medium',
      });
    }
  } catch (err) {
    console.error('Failed to send leave approval notifications:', err);
  }

  res.json({ success: true, data: leave });
});

export const deptApproveLeave = approveLeave;
export const hrApproveLeave = approveLeave;
export const getLeaveStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({
    where: { organizationId: req.user.organizationId },
    select: { status: true, type: true }
  });
  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    dept_approved: leaves.filter(l => l.status === 'dept_approved').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    byType: leaves.reduce((acc: any, l) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; }, {}),
  };
  res.json({ success: true, data: stats });
});
export const getMyLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [leaves, balance] = await Promise.all([
    prisma.leaveRequest.findMany({ 
      where: { userId: req.user.id },
      include: { 
        user: { select: { name: true, email: true, designation: true } },
        department: { select: { name: true } },
        deptApprover: { select: { name: true } },
        hrApprover: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    computeUserLeaveBalance(req.user.id, req.user.organizationId)
  ]);
  const mappedLeaves = leaves.map(mapLeaveRequest);
  res.json({ success: true, data: mappedLeaves, balance });
});

export const getMyLeaveBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetUserId = (req.query.userId as string) || req.user.id;
  const balance = await computeUserLeaveBalance(targetUserId, req.user.organizationId);
  res.json({ success: true, data: balance });
});

// --- Vacancies ---
export const getVacancies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) {
    where.status = req.query.status as string;
  }
  const vacancies = await prisma.vacancy.findMany({ 
    where,
    include: { department: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: vacancies });
});
export const getVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: vacancy });
});
export const createVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, designation, designationId, parentDesignationId, branchId, departmentId, count, positions } = req.body;
  let finalDesignation = (designation || title || '').trim();
  let finalDeptId = typeof departmentId === 'object' ? departmentId?.id : departmentId;

  if (designationId && !finalDesignation) {
    const d = await prisma.designation.findUnique({ where: { id: designationId }, select: { title: true, departmentId: true } });
    if (d) {
      finalDesignation = d.title;
      if (!finalDeptId && d.departmentId) finalDeptId = d.departmentId;
    }
  }
  if (!finalDesignation) finalDesignation = 'Open Position';

  let validDept = null;
  if (finalDeptId && finalDeptId !== 'null' && finalDeptId !== '') {
    validDept = await prisma.department.findFirst({
      where: { id: finalDeptId, organizationId: req.user.organizationId }
    });
  }
  if (!validDept) {
    validDept = await prisma.department.findFirst({ where: { organizationId: req.user.organizationId } });
  }
  if (!validDept) {
    validDept = await prisma.department.create({
      data: {
        name: 'General Operations',
        organizationId: req.user.organizationId,
        status: 'active'
      }
    });
  }
  finalDeptId = validDept.id;

  const parsedCount = Math.max(
    1,
    count !== undefined ? parseInt(String(count), 10) : (positions !== undefined ? parseInt(String(positions), 10) : 1)
  );

  const dbData: any = {
    designation: finalDesignation,
    departmentId: finalDeptId,
    count: parsedCount,
    status: req.body.status || 'open',
    filled: req.body.filled !== undefined ? parseInt(String(req.body.filled), 10) : 0,
    organizationId: req.user.organizationId
  };

  const vacancy = await prisma.vacancy.create({
    data: dbData,
    include: { department: true }
  });

  // Directly reflect the open vacancy as an open position slot on the Org Chart hierarchy
  if (dbData.status === 'open') {
    try {
      await ensureOpenPositionInHierarchy({
        organizationId: req.user.organizationId,
        title: finalDesignation,
        count: Math.max(1, parsedCount - (dbData.filled || 0)),
        designationId: designationId || null,
        parentDesignationId: parentDesignationId || null,
        departmentId: finalDeptId,
        branchId: branchId || null,
        requestedByUserId: req.user.id
      });
    } catch (e) {
      console.error('Failed to sync vacancy to org chart:', e);
    }
  }

  res.status(201).json({ success: true, data: vacancy });
});
export const updateVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { designation, title, departmentId, count, filled, status, designationId, parentDesignationId, branchId } = req.body;
  const updateData: any = {};
  if (designation || title) updateData.designation = (designation || title).trim();
  if (departmentId) updateData.departmentId = typeof departmentId === 'object' ? departmentId.id : departmentId;
  if (count !== undefined) updateData.count = Math.max(1, parseInt(String(count), 10) || 1);
  if (filled !== undefined) updateData.filled = Math.max(0, parseInt(String(filled), 10) || 0);
  if (status) updateData.status = status;

  const vacancy = await prisma.vacancy.update({
    where: { id: req.params.id },
    data: updateData,
    include: { department: true }
  });

  if (vacancy.status === 'open') {
    const openCount = Math.max(0, (vacancy.count || 1) - (vacancy.filled || 0));
    if (openCount > 0) {
      try {
        await ensureOpenPositionInHierarchy({
          organizationId: req.user.organizationId,
          title: vacancy.designation,
          count: openCount,
          designationId: designationId || null,
          parentDesignationId: parentDesignationId || null,
          departmentId: vacancy.departmentId,
          branchId: branchId || null,
          requestedByUserId: req.user.id
        });
      } catch (_e) {}
    }
  }

  res.json({ success: true, data: vacancy });
});
export const deleteVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.vacancy.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const closeVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: { status: 'closed' as any } });
  res.json({ success: true, data: vacancy });
});
export const validateVacancyForHiring = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, valid: true });
});
export const fillVacancyPosition = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
export const getVacancyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

// --- Complaints ---
export const getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaints = await prisma.complaint.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: complaints });
});
export const getComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await prisma.complaint.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: complaint });
});
export const createComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignedToId, userId, ...complaintData } = req.body;
  const complaint = await prisma.complaint.create({
    data: { ...complaintData, organizationId: req.user.organizationId, employeeId: req.user.id }
  });
  res.status(201).json({ success: true, data: complaint });
});
export const updateComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: complaint });
});
export const deleteComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.complaint.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const resolveComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: { status: 'resolved' as any } });
  res.json({ success: true, data: complaint });
});

// --- Holidays ---
function parseHolidayDateUtc(rawDate: any): Date | null {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 0, 0, 0, 0));
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export const getHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {};
  if (req.user?.organizationId) {
    where.organizationId = req.user.organizationId;
  }
  if (req.query.year) {
    const y = Number(req.query.year);
    if (Number.isFinite(y)) {
      where.date = {
        gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
        lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    }
  }
  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  res.json({ success: true, count: holidays.length, data: holidays });
});

export const getHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  if (!holiday) {
    return res.status(404).json({ success: false, message: 'Holiday not found' });
  }
  res.json({ success: true, data: holiday });
});

export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, date, type, description } = req.body;
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ success: false, message: 'Holiday name is required' });
  }
  const parsedDate = parseHolidayDateUtc(date);
  if (!parsedDate) {
    return res.status(400).json({ success: false, message: 'Valid holiday date is required' });
  }
  let orgId = req.user?.organizationId;
  if (!orgId) {
    const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
    orgId = firstOrg?.id;
  }
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization not found' });
  }

  const validTypes = ['national', 'regional', 'company', 'public'];
  const cleanType = validTypes.includes(String(type || '').toLowerCase())
    ? String(type).toLowerCase()
    : 'national';

  const holiday = await prisma.holiday.create({
    data: {
      name: cleanName,
      date: parsedDate,
      type: cleanType,
      description: description ? String(description).trim() : null,
      organizationId: orgId,
    },
  });
  res.status(201).json({ success: true, data: holiday });
});

export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Holiday not found' });
  }
  if (req.user?.organizationId && existing.organizationId !== req.user.organizationId) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this holiday' });
  }

  const { name, date, type, description } = req.body;
  const updateData: Record<string, any> = {};
  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) return res.status(400).json({ success: false, message: 'Holiday name cannot be empty' });
    updateData.name = cleanName;
  }
  if (date !== undefined) {
    const parsedDate = parseHolidayDateUtc(date);
    if (!parsedDate) return res.status(400).json({ success: false, message: 'Invalid holiday date' });
    updateData.date = parsedDate;
  }
  if (type !== undefined) {
    updateData.type = String(type).toLowerCase();
  }
  if (description !== undefined) {
    updateData.description = description ? String(description).trim() : null;
  }

  const holiday = await prisma.holiday.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: holiday });
});

export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Holiday not found' });
  }
  if (req.user?.organizationId && existing.organizationId !== req.user.organizationId) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this holiday' });
  }
  await prisma.holiday.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// --- Announcements ---
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: announcements });
});
export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { expiresAt, ...rest } = req.body;
  const announcement = await prisma.announcement.create({
    data: { 
      ...rest, 
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      organizationId: req.user.organizationId, 
      postedBy: req.user.id 
    }
  });
  res.status(201).json({ success: true, data: announcement });
});
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { expiresAt, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (expiresAt) updateData.expiresAt = new Date(expiresAt);

  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
