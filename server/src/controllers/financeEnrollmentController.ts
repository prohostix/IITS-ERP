// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      program: { select: { name: true, code: true } },
      studyCenter: { select: { name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

export const getFinanceEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId, status: 'finance_review' as any },
    include: { program: true, studyCenter: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'enrolled' as any, reviewedByFinanceId: req.user.id, financeReviewedAt: new Date() }
  });
  res.json({ success: true, data: enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected' as any, reviewedByFinanceId: req.user.id, financeReviewedAt: new Date(), financeRemarks: req.body.remarks }
  });
  res.json({ success: true, data: enrollment });
});
