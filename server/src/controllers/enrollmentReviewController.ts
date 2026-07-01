// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isHistory = req.query.history === 'true';
  const where: any = {
    organizationId: req.user.organizationId
  };

  if (isHistory) {
    where.status = { in: ['finance_review', 'enrolled', 'rejected'] } as any;
  } else {
    where.status = { in: ['submitted', 'document_review'] } as any;
  }

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: { program: true, studyCenter: true, session: true }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getDeptReviewEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { organizationId: req.user.organizationId, status: 'dept_review' as any }, include: { program: true, studyCenter: true, session: true } });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'finance_review' as any, departmentReviewer: { connect: { id: req.user.id } }, departmentReviewedAt: new Date() },
    include: { program: true }
  });

  // Notify Finance Admins - batch insert instead of N+1
  try {
    const financeAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: 'finance_admin' as any }
    });
    await prisma.notification.createMany({
      data: financeAdmins.map(admin => ({
        organizationId: req.user.organizationId,
        userId: admin.id,
        title: '📄 Enrollment Pending Fee Verification',
        message: `${enrollment.studentName} has been approved by Operations and is pending fee verification for ${enrollment.program.name}.`,
        type: 'general' as any,
        priority: 'medium' as any,
        link: 'enrollments_finance'
      }))
    });
  } catch (notifErr) { console.error('Notification dispatch failed:', notifErr); }

  res.json({ success: true, data: enrollment });
});

export const rejectDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected' as any, departmentReviewer: { connect: { id: req.user.id } }, departmentReviewedAt: new Date(), departmentRemarks: req.body.remarks },
    include: { program: true }
  });

  // Notify Study Center and Sales User - batch insert instead of N+1
  try {
    const centerAdmins = await prisma.user.findMany({
      where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin' as any }
    });
    const recipients = centerAdmins.map(a => a.id);
    if (enrollment.salesUserId) recipients.push(enrollment.salesUserId);
    await prisma.notification.createMany({
      data: recipients.map(userId => ({
        organizationId: req.user.organizationId,
        userId,
        title: '❌ Enrollment Rejected by Operations',
        message: `Enrollment for ${enrollment.studentName} was rejected. Remarks: ${req.body.remarks}`,
        type: 'general' as any,
        priority: 'high' as any,
        link: userId === enrollment.salesUserId ? 'student-applications' : 'enrollments'
      }))
    });
  } catch (notifErr) { console.error('Notification dispatch failed:', notifErr); }

  res.json({ success: true, data: enrollment });
});

