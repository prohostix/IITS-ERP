// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) where.status = req.query.status as string;
  const students = await prisma.student.findMany({
    where,
    include: { enrollments: true },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: students.length, data: students });
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { enrollments: true }
  });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  res.status(200).json({ success: true, data: student });
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, name, enrollmentNo, centerId, email, programId } = req.body;
  const finalName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Student';
  const finalEnrollmentNo = enrollmentNo || `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let finalCenterId = centerId;
  if (!finalCenterId || finalCenterId === 'null') {
    const center = await prisma.studyCenter.findFirst({ where: { organizationId: req.user.organizationId } });
    if (center) {
      finalCenterId = center.id;
    }
  }

  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  // Create User if not exists
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const rawPassword = 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const userId = `STD-${Date.now()}`;
    user = await prisma.user.create({
      data: {
        userId,
        email,
        password: hashedPassword,
        name: finalName,
        role: 'student',
        organizationId: req.user.organizationId,
        status: 'active'
      }
    });
  }

  let finalProgramId = programId;
  if (!finalProgramId || finalProgramId === 'null') {
    const firstProg = await prisma.program.findFirst({ where: { organizationId: req.user.organizationId } });
    if (firstProg) finalProgramId = firstProg.id;
  }

  const allowedFields = ['sessionId', 'status', 'joinDate', 'enrolledAt', 'reregStatus', 'referredBy', 'phone', 'address'];
  const dbData: any = {
    name: finalName,
    enrollmentNo: finalEnrollmentNo,
    organization: { connect: { id: req.user.organizationId } },
    center: { connect: { id: finalCenterId } },
    user: { connect: { email: email } }
  };

  if (finalProgramId) {
    dbData.program = { connect: { id: finalProgramId } };
  }

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) dbData[field] = req.body[field];
  }

  const student = await prisma.student.create({
    data: dbData
  });
  res.status(201).json({ success: true, data: { ...student, _id: student.id } });
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: student });
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  await prisma.student.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const approveStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const studentExists = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!studentExists) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }
  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: { status: 'active' as any }
  });
  res.status(200).json({ success: true, data: student });
});

export const bulkImportStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json({ success: true, message: 'Bulk import logic not implemented' });
});

export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const marks = await prisma.internalMark.findMany({
    where: { organizationId: req.user.organizationId },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, data: marks });
});

export const getInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.findUnique({
    where: { id: req.params.id },
    include: { student: { select: { name: true } } }
  });
  if (!mark) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  res.status(200).json({ success: true, data: mark });
});

export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await prisma.internalMark.create({
    data: {
      ...req.body,
      organizationId: req.user.organizationId,
      enteredBy: req.user.id
    }
  });
  res.status(201).json({ success: true, data: mark });
});

export const updateInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
  if (!markExists) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  const mark = await prisma.internalMark.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: mark });
});

export const deleteInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const markExists = await prisma.internalMark.findUnique({ where: { id: req.params.id } });
  if (!markExists) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }
  await prisma.internalMark.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});
