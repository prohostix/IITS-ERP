// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';
import { mapFrontendToPrismaCourseType, mapPrismaToFrontendCourseType } from '../utils/courseTypeHelper.js';

// Universities
export const getUniversities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const universities = await prisma.university.findMany({
    where: { organizationId: req.user.organizationId },
    include: { allowedBranches: true }
  });
  const mapped = universities.map(u => ({
    ...u,
    _id: u.id,
    allowedBranchIds: u.allowedBranches || []
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.findUnique({
    where: { id: req.params.id },
    include: { allowedBranches: true }
  });
  if (university) {
    (university as any)._id = university.id;
    (university as any).allowedBranchIds = university.allowedBranches || [];
  }
  res.json({ success: true, data: university });
});
export const createUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { allowedBranchIds, ...rest } = req.body;
  const data: any = { organizationId: req.user.organizationId };
  for (const field of ['name', 'code', 'address', 'contact', 'country', 'status', 'subDepartmentId']) {
    if (rest[field] !== undefined) data[field] = rest[field];
  }
  const university = await prisma.university.create({
    data: {
      ...data,
      allowedBranches: allowedBranchIds && allowedBranchIds.length > 0
        ? { connect: allowedBranchIds.map((id: string) => ({ id })) }
        : undefined
    }
  });
  res.status(201).json({ success: true, data: { ...university, _id: university.id } });
});
export const updateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { allowedBranchIds, ...rest } = req.body;
  const data: any = {};
  for (const field of ['name', 'code', 'address', 'contact', 'country', 'status', 'subDepartmentId']) {
    if (rest[field] !== undefined) data[field] = rest[field];
  }
  const university = await prisma.university.update({
    where: { id: req.params.id },
    data: {
      ...data,
      allowedBranches: allowedBranchIds
        ? { set: allowedBranchIds.map((id: string) => ({ id })) }
        : undefined
    }
  });
  res.json({ success: true, data: { ...university, _id: university.id } });
});
export const deleteUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.university.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await prisma.university.update({ where: { id: req.params.id }, data: { status: 'active' as any } });
  res.json({ success: true, data: { ...university, _id: university.id } });
});

// Programs
export const getPrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ where: { organizationId: req.user.organizationId }, include: { university: true } });
  const mapped = programs.map(p => ({
    ...p,
    _id: p.id,
    courseType: mapPrismaToFrontendCourseType(p.courseType)
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { university: true } });
  if (program) {
    (program as any)._id = program.id;
    program.courseType = mapPrismaToFrontendCourseType(program.courseType);
  }
  res.json({ success: true, data: program });
});
export const createProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.body.courseType) {
    req.body.courseType = mapFrontendToPrismaCourseType(req.body.courseType);
  }
  let { universityId } = req.body;
  if (!universityId) {
    const defaultUni = await prisma.university.findFirst({ where: { organizationId: req.user.organizationId } });
    if (defaultUni) {
      universityId = defaultUni.id;
    }
  }
  const data: any = { organizationId: req.user.organizationId, universityId };
  for (const field of ['subDepartmentId', 'name', 'code', 'courseType', 'duration', 'hasSemesters', 'semesters', 'status']) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  const program = await prisma.program.create({ data });
  program.courseType = mapPrismaToFrontendCourseType(program.courseType);
  res.status(201).json({ success: true, data: { ...program, _id: program.id } });
});
export const updateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.body.courseType) {
    req.body.courseType = mapFrontendToPrismaCourseType(req.body.courseType);
  }
  const data: any = {};
  for (const field of ['universityId', 'subDepartmentId', 'name', 'code', 'courseType', 'duration', 'hasSemesters', 'semesters', 'status']) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  const program = await prisma.program.update({ where: { id: req.params.id }, data });
  program.courseType = mapPrismaToFrontendCourseType(program.courseType);
  res.json({ success: true, data: { ...program, _id: program.id } });
});
export const deleteProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.program.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const activateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.update({ where: { id: req.params.id }, data: { status: 'active' as any } });
  program.courseType = mapPrismaToFrontendCourseType(program.courseType);
  res.json({ success: true, data: { ...program, _id: program.id } });
});

// Study Centers
export const getStudyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      referrer: { select: { id: true, name: true, email: true, role: true } }
    }
  });
  const mapped = centers.map(c => ({
    ...c,
    _id: c.id
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});
export const getStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({
    where: { id: req.params.id },
    include: {
      referrer: { select: { id: true, name: true, email: true, role: true } }
    }
  });
  if (center) {
    (center as any)._id = center.id;
  }
  res.json({ success: true, data: center });
});
export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isSales = req.user.role === 'sales_admin' || req.user.role === 'bde' || req.user.role === 'employee';
  const { name, referredById, ...restBody } = req.body;
  const email = req.body.email || req.body.contactEmail;

  if (!email) {
    res.status(400).json({ success: false, message: 'Email or contactEmail is required' });
    return;
  }

  // Check if user email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400).json({ success: false, message: 'A user with this email already exists' });
    return;
  }

  // 1. Generate credentials
  const rawPassword = `Center@${Math.floor(1000 + Math.random() * 9000)}`;
  const hashedPassword = await hashPassword(rawPassword);
  const userId = await generateUserId();

  // 2. Create in transaction
  const centerWithCreds = await prisma.$transaction(async (tx) => {
    const allowedFields = ['name', 'code', 'address', 'city', 'state', 'status', 'universityIds', 'programIds'];
    const dbData: any = {
      organizationId: req.user.organizationId,
      status: isSales ? 'pending' : (req.body.status || 'pending'),
      referredBy: isSales ? req.user.id : (referredById === 'null' || !referredById ? null : referredById),
      credentials: { userId, password: rawPassword },
      email,
      contact: req.body.contact || req.body.contactPhone || req.body.contactPerson || 'Not Provided'
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) dbData[field] = req.body[field];
    }

    const center = await tx.studyCenter.create({ 
      data: dbData
    });

    // 3. Create center admin user
    await tx.user.create({
      data: {
        userId,
        email,
        password: hashedPassword,
        name: `${name} Admin`,
        role: 'center_admin',
        organizationId: req.user.organizationId,
        studyCenterId: center.id,
        status: 'active' as any
      }
    });

    return { ...center, _id: center.id, credentials: { userId, password: rawPassword } };
  });

  res.status(201).json({ success: true, data: centerWithCreds });
});
export const updateStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { referredById, ...rest } = req.body;
  const data = {
    ...rest,
    referredBy: referredById === '__none__' || !referredById ? null : referredById
  };
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { ...center, _id: center.id } });
});
export const deleteStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.studyCenter.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const approveStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'active' as any } });
  res.json({ success: true, data: { ...center, _id: center.id } });
});
export const suspendStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'suspended' as any } });
  res.json({ success: true, data: { ...center, _id: center.id } });
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
  const session = await prisma.admissionSession.update({ where: { id: req.params.id }, data: { status: 'approved' as any, approvedBy: req.user.id, approvedAt: new Date() } });
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
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, status: 'pending_verification' as any } });
  res.json({ success: true, data: centers });
});
export const verifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.update({ where: { id: req.params.id }, data: { status: 'verified' as any } });
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
