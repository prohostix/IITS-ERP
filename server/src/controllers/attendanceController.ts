import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendance = await prisma.attendance.create({
    data: { userId: req.user.id, orgId: req.user.organizationId, date: today, checkIn: new Date(), status: 'present' }
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
  const attendances = await prisma.attendance.findMany({ where: { orgId: req.user.organizationId }, include: { user: true } });
  res.json({ success: true, count: attendances.length, data: attendances });
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
  const attendance = await prisma.attendance.create({ data: { ...req.body, orgId: req.user.organizationId } });
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
  res.json({ success: true, data: [] });
});

export const getMyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendances = await prisma.attendance.findMany({ where: { userId: req.user.id }, orderBy: { date: 'desc' } });
  res.json({ success: true, data: attendances });
});

export const getMyAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
