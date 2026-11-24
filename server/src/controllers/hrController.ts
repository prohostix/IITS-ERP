// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureOpenPositionInHierarchy } from './orgAdminController.js';

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

  while (cur.getTime() <= last.getTime()) {
    const dayDate = new Date(cur.getTime());
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

  let allocation = await prisma.leaveAllocation.findUnique({
    where: { userId_year: { userId, year } }
  });

  if (!allocation) {
    allocation = await prisma.leaveAllocation.create({
      data: {
        userId,
        organizationId,
        year,
        sickLeave: 2,
        casualLeave: 2,
        earnedLeave: 0,
        complementaryLeave: 0
      }
    });
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: { in: ['pending', 'dept_approved', 'approved'] },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart }
    }
  });

  const countDaysInRange = (lr: any, rangeStart: Date, rangeEnd: Date) => {
    const s = new Date(Math.max(new Date(lr.startDate).getTime(), rangeStart.getTime()));
    const e = new Date(Math.min(new Date(lr.endDate).getTime(), rangeEnd.getTime()));
    const sDay = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    if (eDay < sDay) return 0;
    if (lr.isHalfDay) return 0.5;
    return Math.round((eDay - sDay) / (1000 * 60 * 60 * 24)) + 1;
  };

  const buildTypeBalance = (typeKey: string, allocatedVal: number) => {
    let usedThisMonth = 0;
    let pendingThisMonth = 0;
    let usedThisYear = 0;
    let pendingThisYear = 0;

    for (const lr of leaves) {
      if (lr.type !== typeKey) continue;
      const mDays = countDaysInRange(lr, monthStart, monthEnd);
      const yDays = countDaysInRange(lr, yearStart, yearEnd);
      if (lr.status === 'approved') {
        usedThisMonth += mDays;
        usedThisYear += yDays;
      } else {
        pendingThisMonth += mDays;
        pendingThisYear += yDays;
      }
    }

    // If allocated <= 4, it represents a monthly allowance (e.g., 2 per month); otherwise yearly
    const isMonthlyQuota = allocatedVal <= 4;
    const effectiveUsed = isMonthlyQuota ? usedThisMonth : usedThisYear;
    const effectivePending = isMonthlyQuota ? pendingThisMonth : pendingThisYear;
    const availableThisMonth = Math.max(0, Number((allocatedVal - effectiveUsed - effectivePending).toFixed(1)));
    const remainingAfterApproved = Math.max(0, Number((allocatedVal - effectiveUsed).toFixed(1)));

    return {
      allocated: allocatedVal,
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
    sick: buildTypeBalance('sick', Number(allocation.sickLeave ?? 2)),
    casual: buildTypeBalance('casual', Number(allocation.casualLeave ?? 0)),
    earned: buildTypeBalance('earned', Number(allocation.earnedLeave ?? 0)),
    compensatory: buildTypeBalance('compensatory', Number(allocation.complementaryLeave ?? 0)),
  };
}

export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isGodMode = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo', 'general_manager', 'project_manager'].includes(req.user.role);
  const isAssignedDeptManager = Boolean(req.user.department?.managerId === req.user.id) || Boolean((req.user as any).managedDepartments?.length > 0) || Boolean(req.user.isDepartmentManager);
  const isDeptManager = ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance', 'sales_admin', 'sales_sub_admin', 'center_admin', 'branch_manager'].includes(req.user.role) || isAssignedDeptManager || Boolean(req.user.subDepartmentId);
  const whereClause: any = { organizationId: req.user.organizationId };

  // Dept managers only see their own department's leaves
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

    const allDepts = Array.from(new Set([userDeptId, ...managedIds].filter(Boolean)));
    if (allDepts.length > 1) {
      whereClause.departmentId = { in: allDepts };
    } else if (allDepts.length === 1) {
      whereClause.departmentId = allDepts[0];
    } else if (req.user.branchId) {
      whereClause.user = { branchId: req.user.branchId };
    }
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

  // Calculate required days
  const start = new Date(startDate);
  const end = new Date(endDate);
  // naive calculation (including weekends), can be improved
  let diffTime = Math.abs(end.getTime() - start.getTime());
  let requiredDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (isHalfDay) requiredDays = 0.5;

  const currentYear = new Date().getFullYear();
  
  // Skip balance check for unpaid and bereavement (or do custom check if needed)
  if (type !== 'unpaid' && type !== 'bereavement') {
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
      reason,
      isHalfDay,
      attachmentUrl,
      startDate: start,
      endDate: end,
      userId: req.user.id, 
      organizationId: req.user.organizationId,
      departmentId: deptId,
      status: 'pending' // pending manager approval
    }
  });
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
  const isHr = req.path.includes('hr-approve');

  const existing = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
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

  // Verify department manager's department
  if (!isHr && !isGodMode) {
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
    const isBranchMatch = Boolean(req.user.branchId && (existing as any).user?.branchId === req.user.branchId);
    const isDeptMatch = Boolean(existing.departmentId && allDepts.includes(existing.departmentId));

    if (!isDeptMatch && !isBranchMatch && !isAssignedDeptManager) {
      res.status(403).json({
        success: false,
        message: 'You can only approve leave requests within your own department.'
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
    include: { user: { select: { name: true } } }
  });

  // Automatically sync approved leave dates to the Attendance table so employee shows as 'On Leave' instead of 'Absent'
  if (leave.status === 'approved') {
    try {
      await syncApprovedLeaveToAttendance(leave);
    } catch (err) {
      console.error('Failed to sync approved leave to attendance:', err);
    }
  }

  // Notify the employee
  try {
    const actionLabel = action === 'approve' ? (isHr ? 'fully approved' : 'approved by department') : 'rejected';
    await prisma.notification.create({
      data: {
        organizationId: req.user.organizationId,
        userId: leave.userId,
        title: `Leave Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your ${leave.type} leave request has been ${actionLabel}.${remarks ? ' Remarks: ' + remarks : ''}`,
        type: 'general' as any,
        priority: 'medium',
        link: 'leaves'
      }
    });
  } catch (_) { /* non-fatal */ }

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
export const getHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holidays = await prisma.holiday.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: holidays });
});
export const getHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: holiday });
});
export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, ...rest } = req.body;
  const holiday = await prisma.holiday.create({ 
    data: { 
      ...rest, 
      date: new Date(date),
      organizationId: req.user.organizationId 
    } 
  });
  res.status(201).json({ success: true, data: holiday });
});
export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (date) updateData.date = new Date(date);

  const holiday = await prisma.holiday.update({ where: { id: req.params.id }, data: updateData });
  res.json({ success: true, data: holiday });
});
export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
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
