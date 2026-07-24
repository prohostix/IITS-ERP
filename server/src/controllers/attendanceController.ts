// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendance = await prisma.attendance.create({
    data: { userId: req.user.id, organizationId: req.user.organizationId, date: today, checkIn: new Date(), status: 'present' as any }
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
  const { date, departmentId } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  
  // Set to midnight UTC for comparison
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  let userWhere: any = { organizationId: req.user.organizationId, status: 'active' as any };
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
      }
    }
  });

  const data = users.map(u => {
    const att = u.attendances[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department?.name || '-',
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status: att?.status || 'absent',
      workingHours: att?.workingHours || 0,
      isLate: att?.isLate || false,
      lateMinutes: att?.lateMinutes || 0
    };
  });

  res.json({ success: true, data, scheduledHours: 8, breakMinutes: 60 });
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
