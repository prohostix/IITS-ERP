import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Universities
export const getUniversities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const universities = await prisma.university.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: universities.length, data: universities });
});
export const getUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: university });
});
export const createUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: university });
});
export const updateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: university });
});
export const deleteUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.university.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: university });
});

// Programs
export const getPrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ where: { organizationId: req.user.organizationId }, include: { university: true } });
  res.json({ success: true, count: programs.length, data: programs });
});
export const getProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { university: true } });
  res.json({ success: true, data: program });
});
export const createProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: program });
});
export const updateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: program });
});
export const deleteProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.program.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: program });
});

// Study Centers
export const getStudyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: centers.length, data: centers });
});
export const getStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: center });
});
export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isSales = req.user.role === 'sales_admin' || req.user.role === 'bde';

  const center = await prisma.studyCenter.create({ 
    data: { 
      ...req.body, 
      organizationId: req.user.organizationId,
      status: isSales ? 'pending' : (req.body.status || 'pending'),
      referredById: isSales ? req.user.id : (req.body.referredById || null)
    } 
  });
  res.status(201).json({ success: true, data: center });
});
export const updateStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: center });
});
export const deleteStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.studyCenter.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active' } });
  res.json({ success: true, data: center });
});
export const suspendStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
  res.json({ success: true, data: center });
});

// Admission Sessions
export const getAdmissionSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.admissionSession.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: sessions.length, data: sessions });
});
export const getAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: session });
});
export const createAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: session });
});
export const updateAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: session });
});
export const deleteAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.admissionSession.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
  res.json({ success: true, data: session });
});

// Internal Marks
export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const marks = await prisma.internalMark.findMany({ where: { organizationId: req.user.organizationId }, include: { student: true } });
  res.json({ success: true, count: marks.length, data: marks });
});
export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.create({ data: { ...req.body, organizationId: req.user.organizationId, enteredBy: req.user.id } });
  res.status(201).json({ success: true, data: mark });
});
export const updateInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: mark });
});
export const deleteInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.internalMark.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Announcements
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcements = await prisma.announcement.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: announcements.length, data: announcements });
});
export const getAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: announcement });
});
export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await prisma.announcement.create({ data: { ...req.body, organizationId: req.user.organizationId, createdById: req.user.id } });
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

// Onboarding
export const getPendingVerificationCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_verification' } });
  res.json({ success: true, data: centers });
});
export const verifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'verified' } });
  res.json({ success: true, data: center });
});

// Allocations
export const getProgramAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocations = await prisma.programAllocation.findMany({ where: { studyCenterId: req.params.id }, include: { program: true } });
  res.json({ success: true, data: allocations });
});
export const allocateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocation = await prisma.programAllocation.create({ data: { ...req.body, studyCenterId: req.params.id, organizationId: req.user.organizationId, allocatedBy: req.user.id } });
  res.status(201).json({ success: true, data: allocation });
});
export const removeAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programAllocation.delete({ where: { id: req.params.allocId } });
  res.json({ success: true, data: {} });
});
