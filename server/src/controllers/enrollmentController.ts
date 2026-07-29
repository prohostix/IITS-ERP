// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.user.studyCenterId || '';
  const [wallet, totalEnrollments, pendingReview] = await Promise.all([
    prisma.studyCenterWallet.findUnique({ where: { studyCenterId: centerId } }),
    prisma.enrollment.count({ where: { studyCenterId: centerId } }),
    prisma.enrollment.count({
      where: {
        studyCenterId: centerId,
        status: { in: ['document_review', 'dept_review', 'finance_review'] }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      ...(wallet || {}),
      balance: wallet?.balance || 0,
      totalEnrollments,
      pendingReview
    }
  });
});

export const submitTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data: any = {
    ...req.body,
    amount: Number(req.body.amount),
    studyCenterId: req.user.studyCenterId || '',
    organizationId: req.user.organizationId,
  };
  
  if (req.file) {
    data.proofDocument = `/uploads/${req.file.filename}`;
  }

  const topUp = await prisma.walletTopUp.create({ data });
  res.status(201).json({ success: true, data: topUp });
});

export const getTopUpHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUps = await prisma.walletTopUp.findMany({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, count: topUps.length, data: topUps });
});

export const getWalletTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.user.studyCenterId || '';

  // Get approved top-ups
  const topUps = await prisma.walletTopUp.findMany({
    where: { studyCenterId: centerId, status: 'approved' },
    orderBy: { createdAt: 'desc' }
  });

  // Get enrollment debits
  const debits = await prisma.enrollmentPayment.findMany({
    where: { studyCenterId: centerId },
    include: {
      enrollment: {
        include: {
          program: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get student invoices paid by center wallet
  const studentInvoices = await prisma.invoice.findMany({
    where: { 
      centerId, 
      studentId: { not: null },
      status: 'paid'
    },
    include: {
      student: {
        include: {
          program: true
        }
      }
    },
    orderBy: { paidAt: 'desc' }
  });

  // Map into a unified ledger structure
  const ledger = [
    ...topUps.map(t => ({
      id: t.id,
      date: t.verifiedAt || t.createdAt,
      type: 'credit',
      amount: t.amount,
      method: t.paymentMethod,
      reference: t.referenceNumber || 'N/A',
      description: 'Wallet Top-Up Approved'
    })),
    ...debits.map(d => ({
      id: d.id,
      date: d.debitedAt || d.createdAt,
      type: 'debit',
      amount: d.amount,
      method: 'wallet_debit',
      reference: d.enrollment?.enrollmentNumber || 'N/A',
      description: `Enrollment: ${d.enrollment?.studentName || 'Student'} (${d.enrollment?.program?.name || 'Program'})`
    })),
    ...studentInvoices.map(inv => ({
      id: inv.id,
      date: inv.paidAt || inv.createdAt,
      type: 'debit',
      amount: inv.total,
      method: 'wallet_debit',
      reference: inv.invoiceNo,
      description: `Student Fee: ${inv.student?.name || 'Student'} (${inv.student?.program?.name || 'Program'}) - ${inv.items?.[0]?.description || 'Installment'}`
    }))
  ];

  // Sort by date descending
  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, count: ledger.length, data: ledger });
});

export const getEnrollablePrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId, status: 'active' as any };
  
  if (req.user.studyCenterId) {
    where.OR = [
      {
        programAllocations: {
          some: {
            centerId: req.user.studyCenterId,
            isActive: true
          }
        }
      },
      {
        university: {
          universityAllocations: {
            some: {
              centerId: req.user.studyCenterId,
              isActive: true
            }
          }
        }
      }
    ];
  }

  const programs = await prisma.program.findMany({
    where,
    include: {
      university: { select: { id: true, name: true, code: true } },
      programFeeStructure: {
        where: {
          organizationId: req.user.organizationId
        }
      }
    }
  });
  res.json({ success: true, count: programs.length, data: programs });
});

export const checkEmailUniqueness = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentEmail, programId, sessionId } = req.body;
  if (!studentEmail || !programId || !sessionId) {
    res.json({ success: false, isUnique: false, message: 'Missing parameters' });
    return;
  }

  const existing = await prisma.enrollment.findFirst({
    where: {
      studentEmail,
      programId,
      sessionId,
      organizationId: req.user.organizationId,
      status: { not: 'rejected' } // Only count active/pending applications
    }
  });

  if (existing) {
    res.json({ success: true, isUnique: false, message: 'An application with this email already exists for this program and session' });
  } else {
    res.json({ success: true, isUnique: true });
  }
});

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    studentName, studentEmail, studentPhone, studentAddress, programId, documents, educationalDetails, sessionId, specialisation,
    abcId, debId, dob, religion, caste, fatherName, motherName, parentMobile, studentPhoto, admissionDate,
    pincode, alternativePhone
  } = req.body;
  const organizationId = req.user.organizationId;
  const studyCenterId = req.user.studyCenterId;

  if (!studentName || !studentEmail || !studentPhone || !studentAddress || !programId) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }
  if (!studyCenterId) {
    res.status(400).json({ success: false, message: 'No study center assigned to your account' });
    return;
  }

  // Form customisation validation
  const center = await prisma.studyCenter.findUnique({
    where: { id: studyCenterId }
  });
  if (center?.customEnrollmentFields) {
    const config = typeof center.customEnrollmentFields === 'string' 
      ? JSON.parse(center.customEnrollmentFields) 
      : center.customEnrollmentFields;
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      for (const [field, requirement] of Object.entries(config)) {
        if (requirement === 'required') {
          if (field.startsWith('doc_')) {
            const docMap: any = { doc_aadhaar: 'Aadhaar Card', doc_10th: '10th Certificate', doc_12th: '12th Certificate', doc_degree: 'Degree Certificate' };
            const reqName = docMap[field];
            const docs = req.body.documents || [];
            if (!docs.some((d: any) => d.reqName === reqName)) {
              res.status(400).json({ success: false, message: `Document '${reqName}' is required by this center's configuration` });
              return;
            }
            continue;
          }
          const val = req.body[field];
          if (val === undefined || val === null || String(val).trim() === '') {
            res.status(400).json({ success: false, message: `Field '${field}' is required by this center's configuration` });
            return;
          }
        }
      }
    }
  }

  let finalSessionId = sessionId;

  if (finalSessionId) {
    const chosenSession = await prisma.admissionSession.findFirst({
      where: {
        id: finalSessionId,
        organizationId,
        status: 'active'
      }
    });
    if (!chosenSession) {
      res.status(400).json({ success: false, message: 'Selected admission session is invalid or inactive' });
      return;
    }
  } else {
    // Auto-find the active admission session for this program/org
    const session = await prisma.admissionSession.findFirst({
      where: {
        organizationId,
        status: 'active',
        OR: [
          { programId },
          { programId: null }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      res.status(400).json({ success: false, message: 'No active admission session found for this program. Please contact admin.' });
      return;
    }
    finalSessionId = session.id;
  }

  // Check for duplicate email in same program+session
  const existing = await prisma.enrollment.findFirst({
    where: { studentEmail, programId, sessionId: finalSessionId, organizationId }
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'An application with this email already exists for this program and session' });
    return;
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentName,
      studentEmail,
      studentPhone,
      studentAddress,
      specialisation,
      abcId,
      debId,
      dob,
      religion,
      caste,
      fatherName,
      motherName,
      parentMobile,
      studentPhoto,
      pincode,
      alternativePhone,
      admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
      status: 'document_review' as any,
      documents: documents ? (typeof documents === 'string' ? JSON.parse(documents) : documents) : [],
      educationalDetails: educationalDetails ? (typeof educationalDetails === 'string' ? JSON.parse(educationalDetails) : educationalDetails) : [],
      organization: { connect: { id: organizationId } },
      program:      { connect: { id: programId } },
      studyCenter:  { connect: { id: studyCenterId } },
      session:      { connect: { id: finalSessionId } },
    }
  });

  // Notify Operations Users
  try {
    const opsUsers = await prisma.user.findMany({
      where: { 
        organizationId,
        OR: [
          { role: { in: ['ops_admin', 'ops_sub_admin'] } as any },
          { role: 'employee' as any, department: { type: 'operations' } }
        ]
      }
    });
    
    // Fetch program details for the message
    const prog = await prisma.program.findUnique({ where: { id: programId } });
    const programName = prog ? prog.name : '';

    // Batch create notifications in a single DB call instead of N+1 loop
    await prisma.notification.createMany({
      data: opsUsers.map(opUser => ({
        organizationId,
        userId: opUser.id,
        title: '📄 New Enrollment Pending Verification',
        message: `A new enrollment for ${studentName} has been submitted by ${center.name} for ${programName}.`,
        type: 'general' as any,
        priority: 'medium' as any,
        link: 'enrollment_review'
      }))
    });
  } catch (notifErr) { console.error('Notification dispatch failed:', notifErr); }

  res.status(201).json({ success: true, data: enrollment });
});


export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const where: any = { studyCenterId: req.user.studyCenterId || '' };

  if (status) {
    where.status = status as string;
  }

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      program: {
        include: { university: { select: { name: true, code: true } } }
      },
      session: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getMyCenterStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.user.studyCenterId || '' } });
  res.json({ success: true, data: center });
});

export const submitMyCenterPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Payment submitted' });
});

export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };

  // Scoping for Sales users: only show admissions from centers they manually added/referred
  if (['sales_admin', 'bde'].includes(req.user.role)) {
    where.studyCenter = { referredBy: req.user.id };
  }

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      studyCenter: { select: { name: true, code: true, referredBy: true } },
      program: {
        include: { university: { select: { name: true, code: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

export const getActiveSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {
    organizationId: req.user.organizationId,
    status: 'active'
  };
  if (req.query.universityId) {
    where.universityId = req.query.universityId as string;
  }
  const sessions = await prisma.admissionSession.findMany({
    where,
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, count: sessions.length, data: sessions });
});

export const updateEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { 
    studentName, studentEmail, studentPhone, studentAddress, programId, documents, educationalDetails, sessionId, specialisation,
    abcId, debId, dob, religion, caste, fatherName, motherName, parentMobile, studentPhoto, admissionDate,
    pincode, alternativePhone
  } = req.body;
  const organizationId = req.user.organizationId;
  const studyCenterId = req.user.studyCenterId;

  if (!studyCenterId) {
    res.status(400).json({ success: false, message: 'No study center assigned to your account' });
    return;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { id, studyCenterId }
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'rejected') {
    res.status(400).json({ success: false, message: 'Only rejected enrollments can be edited and re-submitted' });
    return;
  }

  // Form customisation validation
  const center = await prisma.studyCenter.findUnique({
    where: { id: studyCenterId }
  });
  if (center?.customEnrollmentFields) {
    const config = typeof center.customEnrollmentFields === 'string' 
      ? JSON.parse(center.customEnrollmentFields) 
      : center.customEnrollmentFields;
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      for (const [field, requirement] of Object.entries(config)) {
        if (requirement === 'required') {
          if (field.startsWith('doc_')) {
            const docMap: any = { doc_aadhaar: 'Aadhaar Card', doc_10th: '10th Certificate', doc_12th: '12th Certificate', doc_degree: 'Degree Certificate' };
            const reqName = docMap[field];
            const docs = req.body.documents || (enrollment as any).documents || [];
            if (!docs.some((d: any) => d.reqName === reqName)) {
              res.status(400).json({ success: false, message: `Document '${reqName}' is required by this center's configuration` });
              return;
            }
            continue;
          }
          const val = req.body[field] !== undefined ? req.body[field] : (enrollment as any)[field];
          if (val === undefined || val === null || String(val).trim() === '') {
            res.status(400).json({ success: false, message: `Field '${field}' is required by this center's configuration` });
            return;
          }
        }
      }
    }
  }

  let finalSessionId = sessionId || enrollment.sessionId;
  const targetProgramId = programId || enrollment.programId;

  // Check for duplicate email in same program+session (excluding this enrollment)
  const existing = await prisma.enrollment.findFirst({
    where: {
      studentEmail: studentEmail || enrollment.studentEmail,
      programId: targetProgramId,
      sessionId: finalSessionId,
      organizationId,
      id: { not: id }
    }
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'An application with this email already exists for this program and session' });
    return;
  }

  // Update enrollment details and change status back to document_review
  const updatedEnrollment = await prisma.enrollment.update({
    where: { id },
    data: {
      studentName: studentName !== undefined ? studentName : enrollment.studentName,
      studentEmail: studentEmail !== undefined ? studentEmail : enrollment.studentEmail,
      studentPhone: studentPhone !== undefined ? studentPhone : enrollment.studentPhone,
      studentAddress: studentAddress !== undefined ? studentAddress : enrollment.studentAddress,
      specialisation: specialisation !== undefined ? specialisation : enrollment.specialisation,
      abcId: abcId !== undefined ? abcId : enrollment.abcId,
      debId: debId !== undefined ? debId : enrollment.debId,
      dob: dob !== undefined ? dob : enrollment.dob,
      religion: religion !== undefined ? religion : enrollment.religion,
      caste: caste !== undefined ? caste : enrollment.caste,
      fatherName: fatherName !== undefined ? fatherName : enrollment.fatherName,
      motherName: motherName !== undefined ? motherName : enrollment.motherName,
      parentMobile: parentMobile !== undefined ? parentMobile : enrollment.parentMobile,
      studentPhoto: studentPhoto !== undefined ? studentPhoto : enrollment.studentPhoto,
      pincode: pincode !== undefined ? pincode : enrollment.pincode,
      alternativePhone: alternativePhone !== undefined ? alternativePhone : enrollment.alternativePhone,
      admissionDate: admissionDate !== undefined ? (admissionDate ? new Date(admissionDate) : null) : enrollment.admissionDate,
      programId: targetProgramId,
      sessionId: finalSessionId,
      status: 'document_review' as any,
      departmentRemarks: null, // Clear remarks since it is re-submitted
      documents: documents ? (typeof documents === 'string' ? JSON.parse(documents) : documents) : enrollment.documents,
      educationalDetails: educationalDetails ? (typeof educationalDetails === 'string' ? JSON.parse(educationalDetails) : educationalDetails) : enrollment.educationalDetails,
    }
  });

  res.status(200).json({ success: true, data: updatedEnrollment });
});
