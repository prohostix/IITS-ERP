// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  const where: any = { organizationId: req.user.organizationId };

  if (status) {
    where.status = status as string;
  }

  if (search) {
    where.OR = [
      { studentName: { contains: search as string, mode: 'insensitive' } },
      { studentEmail: { contains: search as string, mode: 'insensitive' } },
      { studentPhone: { contains: search as string, mode: 'insensitive' } },
      { enrollmentNumber: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [enrollments, allEnrollmentsForSummary] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        program: { select: { name: true, code: true } },
        studyCenter: { select: { name: true, code: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.enrollment.findMany({
      where: { organizationId: req.user.organizationId },
      select: { status: true }
    })
  ]);

  // Compute summary counts
  const summary = {
    payment_pending: 0,
    document_review: 0,
    finance_review: 0,
    enrolled: 0,
    rejected: 0,
    department_rejected: 0
  };

  allEnrollmentsForSummary.forEach(e => {
    if (e.status === 'payment_pending') summary.payment_pending++;
    else if (e.status === 'document_review') summary.document_review++;
    else if (e.status === 'finance_review') summary.finance_review++;
    else if (e.status === 'enrolled') summary.enrolled++;
    else if (e.status === 'rejected') summary.rejected++;
    else if (e.status === 'department_rejected') summary.department_rejected++;
  });

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments, summary });
});

export const getFinanceEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId, status: 'finance_review' as any },
    include: { program: true, studyCenter: true, payment: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  // 1. Fetch enrollment details first to inspect program and studyCenterId
  const dbEnrollment = await prisma.enrollment.findUnique({
    where: { id: req.params.id },
    include: { program: true }
  });

  if (!dbEnrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  // 2. Fetch program fee structure
  const feeStructure = await prisma.programFeeStructure.findFirst({
    where: {
      organizationId: req.user.organizationId,
      programId: dbEnrollment.programId
    }
  });

  if (!feeStructure) {
    res.status(400).json({ success: false, message: 'Program fee structure is not configured' });
    return;
  }

  // Calculate total fee
  const addFees = Array.isArray(feeStructure.additionalFees) ? feeStructure.additionalFees : [];
  const nonGstFees = addFees.filter((f: any) => f.label !== 'GST');
  const subtotal = feeStructure.baseFee + nonGstFees.reduce((s: number, f: any) => s + f.amount, 0);
  const gstEntry = addFees.find((f: any) => f.label === 'GST');
  const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
  const totalFee = subtotal + gstAmount;

  // 3. Perform wallet check and deduction inside a transaction
  const enrollment = await prisma.$transaction(async (tx) => {
    // Lock and get StudyCenterWallet
    const wallet = await tx.studyCenterWallet.findUnique({
      where: { studyCenterId: dbEnrollment.studyCenterId }
    });

    if (!wallet || wallet.balance < totalFee) {
      throw new Error(`Insufficient wallet balance in study center. Available: ₹${wallet?.balance || 0}, Required: ₹${totalFee}`);
    }

    // Deduct wallet balance
    const updatedWallet = await tx.studyCenterWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: totalFee } }
    });

    // Create EnrollmentPayment record
    await tx.enrollmentPayment.create({
      data: {
        enrollmentId: dbEnrollment.id,
        studyCenterId: dbEnrollment.studyCenterId,
        walletId: wallet.id,
        amount: totalFee
      }
    });

    // Create/find User
    let user = await tx.user.findUnique({ where: { email: dbEnrollment.studentEmail } });
    if (!user) {
      const rawPassword = 'password123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const userId = `STD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      user = await tx.user.create({
        data: {
          userId,
          email: dbEnrollment.studentEmail,
          password: hashedPassword,
          name: dbEnrollment.studentName,
          role: 'student',
          organizationId: req.user.organizationId,
          status: 'active'
        }
      });
    }

    // Generate enrollment number
    const enrollmentNo = dbEnrollment.enrollmentNumber || `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create Student
    const student = await tx.student.create({
      data: {
        name: dbEnrollment.studentName,
        enrollmentNo,
        phone: dbEnrollment.studentPhone,
        address: dbEnrollment.studentAddress,
        specialisation: dbEnrollment.specialisation,
        sessionId: dbEnrollment.sessionId,
        abcId: dbEnrollment.abcId,
        debId: dbEnrollment.debId,
        dob: dbEnrollment.dob,
        religion: dbEnrollment.religion,
        caste: dbEnrollment.caste,
        fatherName: dbEnrollment.fatherName,
        motherName: dbEnrollment.motherName,
        parentMobile: dbEnrollment.parentMobile,
        studentPhoto: dbEnrollment.studentPhoto,
        status: 'active',
        organization: { connect: { id: req.user.organizationId } },
        center: { connect: { id: dbEnrollment.studyCenterId } },
        user: { connect: { id: user.id } },
        program: { connect: { id: dbEnrollment.programId } }
      }
    });

    // Link enrollment to student
    return await tx.enrollment.update({
      where: { id: dbEnrollment.id },
      data: {
        status: 'enrolled' as any,
        financeReviewer: { connect: { id: req.user.id } },
        financeReviewedAt: new Date(),
        student: { connect: { id: student.id } },
        enrollmentNumber: student.enrollmentNo
      },
      include: { program: true }
    });
  });

  if (enrollment.studentId && enrollment.programId) {
    if (feeStructure.universityFee && feeStructure.universityFee > 0) {
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

  // Create notifications
  try {
    // Notify Center Admins
    const centerAdmins = await prisma.user.findMany({
      where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin' as any }
    });
    for (const admin of centerAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: '🎉 Student Enrolled',
          message: `Student ${enrollment.studentName} has been successfully enrolled for ${enrollment.program.name}.`,
          type: 'general' as any,
          priority: 'high' as any,
          link: 'enrollments'
        }
      });
    }

    // Notify Sales User if exists
    if (enrollment.salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: enrollment.salesUserId,
          title: '🎉 Student Enrolled',
          message: `Student ${enrollment.studentName} has been successfully enrolled for ${enrollment.program.name}.`,
          type: 'general' as any,
          priority: 'high' as any,
          link: 'student-applications'
        }
      });
    }
  } catch (_) {}

  res.json({ success: true, data: enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await prisma.enrollment.update({
    where: { id: req.params.id },
    data: { status: 'rejected' as any, financeReviewer: { connect: { id: req.user.id } }, financeReviewedAt: new Date(), financeRemarks: req.body.remarks },
    include: { program: true }
  });

  // Create notifications
  try {
    // Notify Center Admins
    const centerAdmins = await prisma.user.findMany({
      where: { studyCenterId: enrollment.studyCenterId, role: 'center_admin' as any }
    });
    for (const admin of centerAdmins) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: admin.id,
          title: '❌ Enrollment Rejected by Finance',
          message: `Enrollment for ${enrollment.studentName} was rejected. Remarks: ${req.body.remarks}`,
          type: 'general' as any,
          priority: 'high' as any,
          link: 'enrollments'
        }
      });
    }

    // Notify Sales User if exists
    if (enrollment.salesUserId) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: enrollment.salesUserId,
          title: '❌ Enrollment Rejected by Finance',
          message: `Enrollment for ${enrollment.studentName} was rejected. Remarks: ${req.body.remarks}`,
          type: 'general' as any,
          priority: 'high' as any,
          link: 'student-applications'
        }
      });
    }
  } catch (_) {}

  res.json({ success: true, data: enrollment });
});
