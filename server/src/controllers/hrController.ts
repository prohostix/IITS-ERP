import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// --- Leave Requests ---
export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({
    where: { orgId: req.user.organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: leaves.length, data: leaves });
});

export const getLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: leave });
});

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.create({
    data: { ...req.body, userId: req.user.id, orgId: req.user.organizationId }
  });
  res.status(201).json({ success: true, data: leave });
});

export const updateLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: leave });
});

export const deleteLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.leaveRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const approveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { 
      status: action === 'approve' ? 'approved' : 'rejected', 
      statusRemarks: remarks,
      approvedBy: req.user.id
    }
  });
  res.json({ success: true, data: leave });
});

export const deptApproveLeave = approveLeave;
export const hrApproveLeave = approveLeave;
export const getLeaveStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
export const getMyLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({ where: { userId: req.user.id } });
  res.json({ success: true, data: leaves });
});

// --- Vacancies ---
export const getVacancies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancies = await prisma.vacancy.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: vacancies });
});
export const getVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: vacancy });
});
export const createVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: vacancy });
});
export const updateVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: vacancy });
});
export const deleteVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.vacancy.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const closeVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await prisma.vacancy.update({ where: { id: req.params.id }, data: { status: 'closed' } });
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
  const complaint = await prisma.complaint.create({
    data: { ...req.body, organizationId: req.user.organizationId, userId: req.user.id }
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
  const complaint = await prisma.complaint.update({ where: { id: req.params.id }, data: { status: 'resolved' } });
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
  const holiday = await prisma.holiday.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: holiday });
});
export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await prisma.holiday.update({ where: { id: req.params.id }, data: req.body });
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
  const announcement = await prisma.announcement.create({
    data: { ...req.body, organizationId: req.user.organizationId, createdById: req.user.id }
  });
  res.status(201).json({ success: true, data: announcement });
});
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: announcement });
});
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
