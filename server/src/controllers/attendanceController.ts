// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isWFH = false, isHalfDay = false } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInTime = new Date();
  
  // Find employee and shift
  const employee = await prisma.employeeProfile.findUnique({
    where: { userId: req.user.id },
    include: { shift: true }
  });

  let isLate = false;
  let lateMinutes = 0;
  let status = 'present';

  if (employee?.shift && !employee.shift.isOpenShift && employee.shift.startTime) {
    // Calculate late minutes
    const [hours, minutes] = employee.shift.startTime.split(':').map(Number);
    const expectedTime = new Date(today);
    expectedTime.setHours(hours, minutes, 0, 0);
    
    const graceTime = employee.shift.graceTimeMinutes * 60000; // in milliseconds
    const diff = checkInTime.getTime() - expectedTime.getTime();
    
    if (diff > graceTime) {
      isLate = true;
      lateMinutes = Math.floor(diff / 60000);
      status = 'late';
    }
  }

  if (isHalfDay) status = 'half_day';

  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId: req.user.id, date: today } },
    update: {
      checkIn: checkInTime, 
      status: status as any,
      isLate,
      lateMinutes,
      isWFH,
      isHalfDay
    },
    create: { 
      userId: req.user.id, 
      organizationId: req.user.organizationId, 
      date: today, 
      checkIn: checkInTime, 
      status: status as any,
      isLate,
      lateMinutes,
      isWFH,
      isHalfDay
    }
  });
  res.status(201).json({ success: true, data: attendance });
});

export const punchOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await prisma.attendance.findFirst({
    where: { userId: req.user.id, date: today }
  });

  if (!existing || !existing.checkIn) {
    return res.status(400).json({ success: false, message: 'No check-in found for today' });
  }

  const checkOutTime = new Date();
  const diffHours = (checkOutTime.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60);

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { 
      checkOut: checkOutTime,
      workingHours: diffHours
    }
  });
  res.json({ success: true, data: attendance });
});

export const getTodayAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendance = await prisma.attendance.findFirst({ where: { userId: req.user.id, date: today } });
  res.json({ success: true, data: attendance });
});

export const getMonthlyLateSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

export const getAttendances = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, userId, startDate, endDate, date } = req.query;
  const where: any = { organizationId: req.user.organizationId };

  const targetUser = userId || employeeId;
  if (targetUser && targetUser !== 'all') {
    where.userId = targetUser as string;
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

  const attendances = await prisma.attendance.findMany({ 
    where, 
    include: { user: true },
    orderBy: { date: 'desc' }
  });
  const mapped = attendances.map(a => ({
    ...a,
    employeeId: a.user ? { id: a.user.id, name: a.user.name, email: a.user.email, designation: a.user.designation } : null
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
    employeeId: attendance.user ? {
      id: attendance.user.id,
      name: attendance.user.name,
      email: attendance.user.email,
      designation: attendance.user.designation
    } : null
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

  // Verify / resolve user
  const user = await prisma.user.findFirst({
    where: { id: finalUserId, ...(orgId ? { organizationId: orgId } : {}) }
  });
  if (!user) {
    const empProfile = await prisma.employeeProfile.findFirst({
      where: { id: finalUserId, ...(orgId ? { organizationId: orgId } : {}) }
    });
    if (empProfile?.userId) {
      finalUserId = empProfile.userId;
    } else {
      const anyUser = await prisma.user.findUnique({ where: { id: finalUserId } });
      if (anyUser) {
        finalUserId = anyUser.id;
      } else {
        return res.status(404).json({ success: false, message: 'Employee user not found' });
      }
    }
  }

  const d = new Date(req.body.date);
  if (isNaN(d.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date provided' });
  }
  const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

  const checkIn = req.body.checkIn ? new Date(req.body.checkIn) : null;
  const checkOut = req.body.checkOut ? new Date(req.body.checkOut) : null;

  let workingHours = Number(req.body.workingHours) || 0;
  if (checkIn && checkOut && !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
    const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    workingHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
  }

  const status = req.body.status || 'present';
  const isLate = req.body.isLate !== undefined ? Boolean(req.body.isLate) : status === 'late';
  const isHalfDay = req.body.isHalfDay !== undefined ? Boolean(req.body.isHalfDay) : status === 'half_day';
  const isWFH = Boolean(req.body.isWFH);
  const lateMinutes = Number(req.body.lateMinutes) || 0;
  const notes = req.body.notes !== undefined ? (req.body.notes ? String(req.body.notes) : null) : null;

  const resolvedOrgId = user?.organizationId || req.user.organizationId;

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
    isHalfDay,
    isWFH,
    notes,
  };

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: finalUserId,
        date: targetDate
      }
    },
    update: {
      status: data.status,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      workingHours: data.workingHours,
      isLate: data.isLate,
      lateMinutes: data.lateMinutes,
      isHalfDay: data.isHalfDay,
      isWFH: data.isWFH,
      notes: data.notes,
      organizationId: data.organizationId
    },
    create: data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          designation: true
        }
      }
    }
  });

  const formatted = {
    ...attendance,
    employeeId: attendance.user ? {
      id: attendance.user.id,
      name: attendance.user.name,
      email: attendance.user.email,
      designation: attendance.user.designation
    } : null
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
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes ? String(req.body.notes) : null;
  if (req.body.checkIn !== undefined) updateData.checkIn = req.body.checkIn ? new Date(req.body.checkIn) : null;
  if (req.body.checkOut !== undefined) updateData.checkOut = req.body.checkOut ? new Date(req.body.checkOut) : null;
  if (req.body.isLate !== undefined) updateData.isLate = Boolean(req.body.isLate);
  if (req.body.lateMinutes !== undefined) updateData.lateMinutes = Number(req.body.lateMinutes) || 0;
  if (req.body.isHalfDay !== undefined) updateData.isHalfDay = Boolean(req.body.isHalfDay);
  if (req.body.isWFH !== undefined) updateData.isWFH = Boolean(req.body.isWFH);

  if (req.body.status && req.body.isLate === undefined) {
    updateData.isLate = req.body.status === 'late';
  }
  if (req.body.status && req.body.isHalfDay === undefined) {
    updateData.isHalfDay = req.body.status === 'half_day';
  }

  const finalCheckIn = updateData.checkIn !== undefined ? updateData.checkIn : attendance.checkIn;
  const finalCheckOut = updateData.checkOut !== undefined ? updateData.checkOut : attendance.checkOut;
  if (finalCheckIn && finalCheckOut && !isNaN(finalCheckIn.getTime()) && !isNaN(finalCheckOut.getTime())) {
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
          designation: true
        }
      }
    }
  });

  const formatted = {
    ...updatedAttendance,
    employeeId: updatedAttendance.user ? {
      id: updatedAttendance.user.id,
      name: updatedAttendance.user.name,
      email: updatedAttendance.user.email,
      designation: updatedAttendance.user.designation
    } : null
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

export const getHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.hRSettings.findFirst({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: settings });
});

export const createOrUpdateHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.hRSettings.upsert({
    where: { organizationId: req.user.organizationId },
    update: req.body,
    create: { ...req.body, organizationId: req.user.organizationId }
  });
  res.json({ success: true, data: settings });
});

export const biometricSync = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Biometric sync triggered' });
});

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { date, departmentId } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Set to midnight UTC for comparison
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let userWhere: any = { 
      organizationId: req.user.organizationId, 
      status: 'active' as any,
      role: { notIn: ['student', 'center_admin', 'superadmin'] }
    };
    if (departmentId) {
      userWhere.departmentId = departmentId as string;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        department: true,
        attendances: {
          where: {
            date: { gte: startOfDay, lte: endOfDay }
          }
        },
        assignedTasks: {
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay } // Or targetDate
          }
        },
        auditLogs: {
          where: {
            timestamp: { gte: startOfDay, lte: endOfDay }
          }
        }
      }
    });

    const scheduledHours = 8;
    const breakMinutes = 60;

    const data = users.map(u => {
      const att = u.attendances[0];
      const tasks = u.assignedTasks || [];
      const auditLogs = u.auditLogs || [];

      const completedToday = tasks.filter(t => t.status === 'completed').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;
      const overdue = tasks.filter(t => t.status === 'overdue').length;

      const erpActivity: Record<string, number> = {};
      auditLogs.forEach(log => {
        erpActivity[log.action] = (erpActivity[log.action] || 0) + 1;
      });

      let productiveHours = 0;
      let timeWasted: number | null = null;
      let workingHours = att?.workingHours || 0;

      if (att && att.checkIn) {
        productiveHours = workingHours;
        timeWasted = Math.max(0, scheduledHours - productiveHours);
      }

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'Employee',
        designation: u.designation || '',
        department: u.department?.name || '-',
        departmentId: u.departmentId,
        attendance: att ? {
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          isLate: att.isLate,
          lateMinutes: att.lateMinutes,
          workingHours: att.workingHours
        } : null,
        productiveHours,
        scheduledHours,
        timeWasted,
        breakMinutes,
        erpActions: auditLogs.length,
        erpActivity,
        tasks: {
          total: tasks.length,
          completedToday,
          inProgress,
          overdue,
          list: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
        }
      };
    });

    res.json({ success: true, data, scheduledHours, breakMinutes });
  } catch (err: any) {
    console.error("GET ACTIVITY REPORT ERROR:", err);
    throw err;
  }
});

export const getMyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendances = await prisma.attendance.findMany({ 
    where: { userId: req.user.id }, 
    include: { user: true },
    orderBy: { date: 'desc' } 
  });
  const mapped = attendances.map(a => ({
    ...a,
    employeeId: a.user ? { id: a.user.id, name: a.user.name, email: a.user.email, designation: a.user.designation } : null
  }));
  res.json({ success: true, data: mapped });
});

export const getMyAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
