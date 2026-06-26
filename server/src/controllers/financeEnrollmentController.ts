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
    data: { status: 'enrolled' as any, reviewedByFinanceId: req.user.id, financeReviewedAt: new Date() },
    include: { program: true }
  });

  if (enrollment.studentId && enrollment.programId) {
    const feeStructure = await prisma.programFeeStructure.findFirst({
      where: {
        organizationId: req.user.organizationId,
        programId: enrollment.programId
      }
    });

    if (feeStructure && feeStructure.universityFee && feeStructure.universityFee > 0) {
      const existing = await prisma.universityFeePayment.findUnique({
        where: { enrollmentId: enrollment.id }
      });

      if (!existing) {
        await prisma.universityFeePayment.create({
          data: {
            organizationId: req.user.organizationId,
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            semesterOrYear: feeStructure.billingCycle === 'per_semester' ? 'Semester 1' : 'Year 1',
            amount: feeStructure.universityFee,
            status: 'pending'
          }
        });
      }
    }
  }

  res.json({ success: true, data: enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected' as any, reviewedByFinanceId: req.user.id, financeReviewedAt: new Date(), financeRemarks: req.body.remarks }
  });
  res.json({ success: true, data: enrollment });
});
