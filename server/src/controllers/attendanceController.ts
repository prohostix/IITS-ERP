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

  const attendance = await prisma.attendance.create({
    data: { 
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
  const attendance = await prisma.attendance.updateMany({
    where: { userId: req.user.id, date: today },
    data: { checkOut: new Date() }
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
  const attendances = await prisma.attendance.findMany({ 
    where: { organizationId: req.user.organizationId }, 
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
  res.json({ success: true, data: attendance });
});

export const createAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: req.body.userId,
        date: new Date(req.body.date)
      }
    },
    update: { ...req.body, organizationId: req.user.organizationId },
    create: { ...req.body, organizationId: req.user.organizationId }
  });
  res.status(201).json({ success: true, data: attendance });
});
export const markAttendance = createAttendance;

export const updateAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  const updatedAttendance = await prisma.attendance.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: updatedAttendance });
});

export const deleteAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }
  await prisma.attendance.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
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
