// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getBranchScope, getBranchScopeByBranchId, getAllBranchesScope } from '../utils/branchScope.js';
import { getSalesChainForCenterOrEnrollment } from './notificationController.js';

export const getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isHistory = req.query.history === 'true';
  const where: any = {
    organizationId: req.user.organizationId
  };

  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    where.studyCenterId = { in: scope.centerIds };
  } else if (req.query.branchId && req.query.branchId !== 'all') {
    const scope = await getBranchScopeByBranchId(req.user.organizationId, String(req.query.branchId));
    where.studyCenterId = { in: scope.centerIds };
  }

  if (isHistory) {
    where.status = { in: ['pending_finance_review', 'payment_pending', 'enrolled', 'rejected'] } as any;
  } else {
    where.status = 'pending_doc_review';
  }

  const [enrollments, allBranchesScope] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: { program: { include: { university: true } }, studyCenter: true, session: true }
    }),
    getAllBranchesScope(req.user.organizationId)
  ]);
  const mapped = enrollments.map((e: any) => {
    const cid = e.studyCenterId || e.studyCenter?.id || '';
    const resolvedBranch = (cid && allBranchesScope.centerBranchMap[cid]) || (e.studyCenter?.referredBy ? allBranchesScope.staffBranchMap[e.studyCenter.referredBy] : null);
    const branchName = resolvedBranch?.branchName || e.studyCenter?.branchName || null;
    const branchId = resolvedBranch?.branchId || null;
    return {
      ...e,
      branchId,
      branchName,
      studyCenter: e.studyCenter ? { ...e.studyCenter, branchName: e.studyCenter.branchName || branchName, branchId } : e.studyCenter
    };
  });
  res.json({ success: true, count: mapped.length, data: mapped });
});

export const getDeptReviewEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId, status: 'pending_doc_review' };
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    where.studyCenterId = { in: scope.centerIds };
  } else if (req.query.branchId && req.query.branchId !== 'all') {
    const scope = await getBranchScopeByBranchId(req.user.organizationId, String(req.query.branchId));
    where.studyCenterId = { in: scope.centerIds };
  }
  const [enrollments, allBranchesScope] = await Promise.all([
    prisma.enrollment.findMany({ where, include: { program: { include: { university: true } }, studyCenter: true, session: true } }),
    getAllBranchesScope(req.user.organizationId)
  ]);
  const mapped = enrollments.map((e: any) => {
    const cid = e.studyCenterId || e.studyCenter?.id || '';
    const resolvedBranch = (cid && allBranchesScope.centerBranchMap[cid]) || (e.studyCenter?.referredBy ? allBranchesScope.staffBranchMap[e.studyCenter.referredBy] : null);
    const branchName = resolvedBranch?.branchName || e.studyCenter?.branchName || null;
    const branchId = resolvedBranch?.branchId || null;
    return {
      ...e,
      branchId,
      branchName,
      studyCenter: e.studyCenter ? { ...e.studyCenter, branchName: e.studyCenter.branchName || branchName, branchId } : e.studyCenter
    };
  });
  res.json({ success: true, count: mapped.length, data: mapped });
});

export const updateDocumentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { docName, status, remarks } = req.body;
  if (!docName || !status) {
    res.status(400).json({ success: false, message: 'Document name and status are required' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  const documents = Array.isArray(enrollment.documents) ? [...enrollment.documents] : [];
  const docIndex = documents.findIndex((d: any) => d.name === docName);
  
  if (docIndex === -1) {
    res.status(404).json({ success: false, message: 'Document not found' });
    return;
  }

  documents[docIndex] = { ...documents[docIndex], status, remarks: remarks || null };

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { documents: documents as any },
  });

  res.json({ success: true, data: updatedEnrollment });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentEnrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: { program: { include: { university: true } } }
  });

  if (!currentEnrollment || !currentEnrollment.program?.university) {
    res.status(404).json({ success: false, message: 'Enrollment or University not found' });
    return;
  }

  const category = (currentEnrollment.program.university as any).category || 'team_lease';
  const isDirectToUni = currentEnrollment.paymentType === 'direct_to_university';
  const nextStatus = (category === 'team_lease' || category === 'direct_iits' || isDirectToUni) ? 'pending_finance_review' : 'payment_pending';

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: nextStatus, departmentReviewer: { connect: { id: req.user.id } }, departmentReviewedAt: new Date() },
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
  const existing = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
  if (existing?.paymentType === 'wallet') {
    const payment = await prisma.enrollmentPayment.findFirst({ where: { enrollmentId: existing.id } });
    if (payment) {
      await prisma.$transaction(async (tx) => {
        await tx.studyCenterWallet.update({
          where: { studyCenterId: existing.studyCenterId },
          data: { balance: { increment: payment.amount } }
        });
        await tx.enrollmentPayment.delete({ where: { id: payment.id } });
      });
    }
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected' as any, departmentReviewer: { connect: { id: req.user.id } }, departmentReviewedAt: new Date(), departmentRemarks: req.body.remarks },
    include: { program: true }
  });

  // Notify Study Center and Sales Chain - batch insert instead of N+1
  try {
    const [centerAdmins, salesChainIds] = await Promise.all([
      prisma.user.findMany({
        where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin' as any },
        select: { id: true }
      }),
      getSalesChainForCenterOrEnrollment(req.user.organizationId, {
        studyCenterId: enrollment.studyCenterId,
        salesUserId: enrollment.salesUserId
      })
    ]);
    const centerAdminSet = new Set(centerAdmins.map(a => a.id));
    const recipients = Array.from(new Set([...centerAdmins.map(a => a.id), ...salesChainIds]));
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map(userId => ({
          organizationId: req.user.organizationId,
          userId,
          title: '❌ Enrollment Rejected by Operations',
          message: `Enrollment for ${enrollment.studentName} was rejected. Remarks: ${req.body.remarks}`,
          type: 'general' as any,
          priority: 'high' as any,
          link: centerAdminSet.has(userId) ? 'enrollments' : 'center_admissions'
        }))
      });
    }
  } catch (notifErr) { console.error('Notification dispatch failed:', notifErr); }

  res.json({ success: true, data: enrollment });
});

