// @ts-nocheck
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/postgres.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

// ─── Public: Validate invite token and get form data ─────────────────────────

export const validateStudentInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const invite = await prisma.studyCenterInvite.findUnique({
    where: { token },
    include: {
      referrer: { select: { id: true, name: true, organizationId: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  if (!invite) {
    res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    return;
  }

  if (invite.status !== 'pending') {
    res.status(400).json({ success: false, message: 'This invite link has already been used or expired' });
    return;
  }

  if (new Date(invite.expiresAt) < new Date()) {
    res.status(400).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  // Get programs for this invite
  const programs = await prisma.program.findMany({
    where: {
      organizationId: invite.organizationId,
      status: 'active' as any,
      ...(invite.programIds.length > 0 ? { id: { in: invite.programIds } } : {}),
      ...(invite.universityIds.length > 0 ? { universityId: { in: invite.universityIds } } : {}),
    },
    include: {
      university: { select: { id: true, name: true, code: true } },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      organizationName: invite.organization.name,
      referrerName: invite.referrer.name,
      programs,
      token,
    },
  });
});

// ─── Public: Student submits their data via invite link ───────────────────────

export const submitStudentApplication = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { studentName, studentEmail, studentPhone, studentAddress, programId, sessionId, documents } = req.body;

  // Validate required fields
  const missing: string[] = [];
  if (!studentName) missing.push('studentName');
  if (!studentEmail) missing.push('studentEmail');
  if (!studentPhone) missing.push('studentPhone');
  if (!studentAddress) missing.push('studentAddress');
  if (!programId) missing.push('programId');
  if (missing.length > 0) {
    res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  // Validate invite
  const invite = await prisma.studyCenterInvite.findUnique({
    where: { token },
    include: { referrer: { select: { id: true, organizationId: true } } },
  });

  if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()) {
    res.status(400).json({ success: false, message: 'Invalid or expired invite link' });
    return;
  }

  const organizationId = invite.organizationId;
  const salesUserId = invite.referredBy;

  // Validate program belongs to this org and invite's universities
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      organizationId: organizationId,
      status: 'active' as any,
      ...(invite.universityIds.length > 0 ? { universityId: { in: invite.universityIds } } : {}),
    },
  });

  if (!program) {
    res.status(400).json({ success: false, message: 'Invalid program selection' });
    return;
  }

  // Find or create a default study center for sales-led enrollments
  // Use a special "Sales Direct" center or the first active center
  let studyCenter = await prisma.studyCenter.findFirst({
    where: { organizationId: organizationId, status: 'active' as any },
    orderBy: { createdAt: 'asc' },
  });

  if (!studyCenter) {
    res.status(400).json({ success: false, message: 'No active study center configured for this organization' });
    return;
  }

  // Find or use first active session
  let session = sessionId
    ? await prisma.admissionSession.findFirst({ where: { id: sessionId, organizationId: organizationId } })
    : await prisma.admissionSession.findFirst({ where: { organizationId: organizationId, status: 'active' as any }, orderBy: { createdAt: 'desc' } });

  if (!session) {
    res.status(400).json({ success: false, message: 'No active admission session found' });
    return;
  }

  // Check for duplicate email in same program+session
  const existing = await prisma.enrollment.findFirst({
    where: { studentEmail, programId, sessionId: session.id, organizationId: organizationId },
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'An application with this email already exists for this program' });
    return;
  }

  const now = new Date();

  // Create enrollment with document_review status
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: organizationId,
      studentName,
      studentEmail,
      studentPhone,
      studentAddress,
      programId,
      studyCenterId: studyCenter.id,
      sessionId: session.id,
      status: 'document_review' as any,
      salesUserId,
      statusHistory: [
        {
          status: 'submitted' as any,
          actorId: 'student',
          actorName: studentName,
          timestamp: now.toISOString(),
          note: 'Student submitted application via sales invite link',
        },
        {
          status: 'document_review' as any,
          actorId: 'system',
          timestamp: now.toISOString(),
          note: 'Forwarded to Operations for document verification',
        },
      ],
    } as any,
  });

  // Notify the sales user
  try {
    await prisma.notification.create({
      data: {
        organizationId: organizationId,
        userId: salesUserId,
        title: 'New Student Application',
        message: `${studentName} has submitted an application for ${program.name} via your invite link.`,
        type: 'general' as any,
        priority: 'medium',
        link: 'student-applications',
      },
    });
  } catch (_) { /* non-critical */ }

  // Notify ops admins
  try {
    const opsAdmins = await prisma.user.findMany({
      where: { organizationId: organizationId, role: 'ops_admin' as any, status: 'active' as any },
      select: { id: true },
    });
    for (const admin of opsAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: organizationId,
          userId: admin.id,
          title: 'New Student Application for Review',
          message: `${studentName} has applied for ${program.name}. Please review the documents.`,
          type: 'general' as any,
          priority: 'medium',
          link: 'enrollment_review',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully. You will be notified once reviewed.',
    data: { enrollmentId: enrollment.id, status: enrollment.status },
  });
});

// ─── Sales: Get all enrollments from their invite links ──────────────────────

export const getSalesEnrollmentPipeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const salesUserId = req.user.id;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: organizationId,
      salesUserId,
    },
    include: {
      program: { select: { id: true, name: true, code: true, courseType: true } },
      studyCenter: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true } },
      departmentReviewer: { select: { id: true, name: true, email: true } },
      financeReviewer: { select: { id: true, name: true, email: true } },
    } as any,
    orderBy: { createdAt: 'desc' },
  });

  // Build pipeline summary
  const summary = {
    total: enrollments.length,
    document_review: enrollments.filter(e => e.status === 'document_review').length,
    finance_review: enrollments.filter(e => e.status === 'finance_review').length,
    enrolled: enrollments.filter(e => e.status === 'enrolled').length,
    ops_rejected: enrollments.filter(e => e.status === 'ops_rejected').length,
    rejected: enrollments.filter(e => e.status === 'rejected').length,
  };

  res.status(200).json({ success: true, count: enrollments.length, summary, data: enrollments });
});

// ─── Ops: Approve → finance_review (sales-led flow) ──────────────────────────

export const approveSalesEnrollmentOps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'document_review') {
    res.status(409).json({ success: false, message: `Cannot approve from status: ${enrollment.status}` });
    return;
  }

  const history = ((enrollment as any).statusHistory as any[]) || [];
  history.push({
    status: 'finance_review' as any,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'ops_admin',
    timestamp: now.toISOString(),
    note: 'Documents verified by Operations',
  });

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'finance_review' as any,
      departmentReviewedBy: req.user.id,
      departmentReviewedAt: now,
      statusHistory: history,
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: 'Application Verified by Operations',
          message: `${enrollment.studentName}'s application has been verified and forwarded to Finance for payment.`,
          type: 'general' as any,
          priority: 'medium',
          link: 'student-applications',
        },
      });
    }
    // Notify finance admins
    const financeAdmins = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, role: 'finance_admin' as any, status: 'active' as any },
      select: { id: true },
    });
    for (const admin of financeAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: 'Student Application Pending Payment',
          message: `${enrollment.studentName}'s application is ready for payment verification.`,
          type: 'general' as any,
          priority: 'medium',
          link: 'enrollments_finance',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});

// ─── Finance: Approve → enrolled ─────────────────────────────────────────────

export const approveSalesEnrollmentFinance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'finance_review') {
    res.status(409).json({ success: false, message: `Cannot approve from status: ${enrollment.status}` });
    return;
  }

  const history = ((enrollment as any).statusHistory as any[]) || [];
  history.push({
    status: 'enrolled' as any,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'finance_admin',
    timestamp: now.toISOString(),
    note: 'Payment verified by Finance. Student enrolled.',
  });

  // Create/find User
  let user = await prisma.user.findUnique({ where: { email: enrollment.studentEmail } });
  if (!user) {
    const rawPassword = 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const userId = `STD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    user = await prisma.user.create({
      data: {
        userId,
        email: enrollment.studentEmail,
        password: hashedPassword,
        name: enrollment.studentName,
        role: 'student',
        organizationId: req.user.organizationId,
        status: 'active'
      }
    });
  }

  // Generate enrollment number
  const enrollmentNo = enrollment.enrollmentNumber || `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Find or create Student
  let student = await prisma.student.findUnique({ where: { email: enrollment.studentEmail } });
  if (!student) {
    student = await prisma.student.create({
      data: {
        name: enrollment.studentName,
        enrollmentNo,
        phone: enrollment.studentPhone,
        address: enrollment.studentAddress,
        specialisation: enrollment.specialisation,
        status: 'active',
        organization: { connect: { id: req.user.organizationId } },
        center: { connect: { id: enrollment.studyCenterId } },
        user: { connect: { email: enrollment.studentEmail } },
        program: { connect: { id: enrollment.programId } }
      }
    });
  }

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: 'enrolled' as any,
      financeReviewer: { connect: { id: req.user.id } },
      financeReviewedAt: now,
      enrolledAt: now,
      statusHistory: history,
      student: { connect: { id: student.id } },
      enrollmentNumber: student.enrollmentNo
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: '🎉 Student Enrolled!',
          message: `${enrollment.studentName} has been successfully enrolled after payment verification.`,
          type: 'general' as any,
          priority: 'high',
          link: 'student-applications',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});

// ─── Ops/Finance: Reject ──────────────────────────────────────────────────────

export const rejectSalesEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;
  const now = new Date();

  if (!remarks?.trim()) {
    res.status(400).json({ success: false, message: 'remarks is required for rejection' });
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });

  if (!enrollment || enrollment.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  const allowedStatuses = ['document_review', 'finance_review'];
  if (!allowedStatuses.includes(enrollment.status)) {
    res.status(409).json({ success: false, message: `Cannot reject from status: ${enrollment.status}` });
    return;
  }

  const newStatus = enrollment.status === 'document_review' ? 'ops_rejected' : 'rejected';
  const history = ((enrollment as any).statusHistory as any[]) || [];
  history.push({
    status: newStatus,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    timestamp: now.toISOString(),
    remarks,
  });

  const updated = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: {
      status: newStatus,
      ...(enrollment.status === 'document_review'
        ? { departmentRemarks: remarks, departmentReviewer: { connect: { id: req.user.id } }, departmentReviewedAt: now }
        : { financeRemarks: remarks, financeReviewer: { connect: { id: req.user.id } }, financeReviewedAt: now }),
      statusHistory: history,
    } as any,
  });

  // Notify sales user
  try {
    if ((enrollment as any).salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: (enrollment as any).salesUserId,
          title: 'Application Rejected',
          message: `${enrollment.studentName}'s application was rejected by ${req.user.role === 'ops_admin' ? 'Operations' : 'Finance'}. Reason: ${remarks}`,
          type: 'general' as any,
          priority: 'high',
          link: 'student-applications',
        },
      });
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: updated });
});
