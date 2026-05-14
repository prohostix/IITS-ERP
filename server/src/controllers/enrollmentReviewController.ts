import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'document_review' as any }, include: { program: true, studyCenter: true } });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getDeptReviewEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'dept_review' as any }, include: { program: true, studyCenter: true } });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({ where: { id: req.params.id }, data: { status: 'finance_review' as any, reviewedByDeptId: req.user.id, deptReviewedAt: new Date() } });
  res.json({ success: true, data: enrollment });
});

export const rejectDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({ where: { id: req.params.id }, data: { status: 'rejected' as any, reviewedByDeptId: req.user.id, deptReviewedAt: new Date(), deptRemarks: req.body.remarks } });
  res.json({ success: true, data: enrollment });
});
