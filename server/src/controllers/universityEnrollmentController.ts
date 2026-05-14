import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /enrollment/university-review
// Returns all enrollments with status university_review for the requesting university_admin's university
export const getUniversityReviewQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const universityId = req.user.universityId;

  if (!universityId) {
    res.status(403).json({ success: false, message: 'No university linked to your account' });
    return;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: 'university_review',
      program: { universityId },
    },
    include: {
      program: { select: { id: true, name: true, code: true, courseType: true } },
      studyCenter: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

// PUT /enrollment/university-review/:id/approve
export const approveUniversityEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const universityId = req.user.universityId;
  const now = new Date();

  if (!universityId) {
    res.status(403).json({ success: false, message: 'No university linked to your account' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: {
      program: { select: { universityId: true, name: true } },
      studyCenter: { select: { id: true } },
    },
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if ((enrollment as any).program?.universityId !== universityId) {
    res.status(403).json({ success: false, message: 'Enrollment does not belong to your university' });
    return;
  }

  if (enrollment.status !== 'university_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to enrolled` });
    return;
  }

  const updatedStatusHistory = ((enrollment as any).statusHistory as any[]) || [];
  updatedStatusHistory.push({ status: 'enrolled', actorId: req.user.id, timestamp: now.toISOString() });

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'enrolled',
      enrolledAt: now,
      universityReviewedBy: req.user.id,
      universityReviewedAt: now,
      statusHistory: updatedStatusHistory,
    } as any,
  });

  // Notify center_admin users of the partner portal
  try {
    const centerAdmins = await prisma.user.findMany({
      where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin', status: 'active' },
      select: { id: true },
    });
    const opsAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: 'ops_admin', status: 'active' },
      select: { id: true },
    });
    const recipients = [...centerAdmins, ...opsAdmins];
    for (const u of recipients) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: u.id,
          title: 'Enrollment Approved',
          message: `${enrollment.studentName}'s enrollment in ${(enrollment as any).program?.name} has been approved by the university. The student is now officially enrolled.`,
          type: 'general',
          priority: 'medium',
          link: 'enrollment/enrollments',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updatedEnrollment });
});

// PUT /enrollment/university-review/:id/reject
export const rejectUniversityEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;
  const universityId = req.user.universityId;
  const now = new Date();

  if (!remarks || remarks.trim().length === 0) {
    res.status(400).json({ success: false, message: 'remarks is required for rejection' });
    return;
  }

  if (!universityId) {
    res.status(403).json({ success: false, message: 'No university linked to your account' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: {
      program: { select: { universityId: true, name: true } },
      studyCenter: { select: { id: true } },
    },
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if ((enrollment as any).program?.universityId !== universityId) {
    res.status(403).json({ success: false, message: 'Enrollment does not belong to your university' });
    return;
  }

  if (enrollment.status !== 'university_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to university_rejected` });
    return;
  }

  const updatedStatusHistory = ((enrollment as any).statusHistory as any[]) || [];
  updatedStatusHistory.push({ status: 'university_rejected', actorId: req.user.id, timestamp: now.toISOString(), remarks });

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'university_rejected',
      universityRemarks: remarks,
      universityReviewedBy: req.user.id,
      universityReviewedAt: now,
      statusHistory: updatedStatusHistory,
    } as any,
  });

  // Notify center_admin and ops_admin users with the remark
  try {
    const centerAdmins = await prisma.user.findMany({
      where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin', status: 'active' },
      select: { id: true },
    });
    const opsAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: 'ops_admin', status: 'active' },
      select: { id: true },
    });
    const recipients = [...centerAdmins, ...opsAdmins];
    for (const u of recipients) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: u.id,
          title: 'Enrollment Rejected by University',
          message: `${enrollment.studentName}'s enrollment in ${(enrollment as any).program?.name} was rejected by the university. Reason: ${remarks}`,
          type: 'general',
          priority: 'high',
          link: 'enrollment/enrollments',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updatedEnrollment });
});
