// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wallet = await prisma.studyCenterWallet.findUnique({ where: { studyCenterId: req.user.studyCenterId || '' } });
  res.json({ success: true, data: wallet });
});

export const submitTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUp = await prisma.walletTopUp.create({ data: { ...req.body, studyCenterId: req.user.studyCenterId || '', organizationId: req.user.organizationId } });
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

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentName, studentEmail, studentPhone, studentAddress, programId, documents, educationalDetails, sessionId, specialisation } = req.body;
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
      status: 'document_review' as any,
      documents: documents ? (typeof documents === 'string' ? JSON.parse(documents) : documents) : [],
      educationalDetails: educationalDetails ? (typeof educationalDetails === 'string' ? JSON.parse(educationalDetails) : educationalDetails) : [],
      organization: { connect: { id: organizationId } },
      program:      { connect: { id: programId } },
      studyCenter:  { connect: { id: studyCenterId } },
      session:      { connect: { id: finalSessionId } },
    }
  });
  res.status(201).json({ success: true, data: enrollment });
});


export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studyCenterId: req.user.studyCenterId || '' },
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
  const sessions = await prisma.admissionSession.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: 'active'
    },
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, count: sessions.length, data: sessions });
});
