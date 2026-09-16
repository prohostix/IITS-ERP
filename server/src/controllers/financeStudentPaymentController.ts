import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStudentPaymentLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, universityId, programId, branchId } = req.query;

  let where: any = { organizationId: req.user.organizationId };

  if (search) {
    where.OR = [
      { studentName: { contains: search as string, mode: 'insensitive' } },
      { enrollmentNumber: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (programId && programId !== 'all') where.programId = programId as string;
  if (branchId && branchId !== 'all') where.studyCenterId = branchId as string;
  
  if (universityId && universityId !== 'all') {
    where.program = { universityId: universityId as string };
  }

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      program: {
        select: { 
          name: true, 
          code: true, 
          universityId: true,
          programFeeStructure: {
            select: { billingCycle: true, admissionSessionId: true, organizationId: true }
          }
        }
      },
      studentFeeReceipts: {
        orderBy: { receiptDate: 'desc' }
      },
      payment: true // initial wallet payment might be relevant if considered as fee received?
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedLogs = enrollments.map(enr => {
    const extraFees = (enr.extraFees as any[]) || [];
    const totalExtraFees = extraFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    const totalFee = (enr.totalFee || 0) + totalExtraFees;
    
    // Sum receipts + initial wallet payment
    const manualReceipts = enr.studentFeeReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const walletPayment = enr.payment?.amount || 0;
    const totalReceived = manualReceipts + walletPayment;
    const balance = totalFee - totalReceived;
    
    const status = totalFee === 0 ? 'No Fee Set' : (balance <= 0 ? 'Paid' : (totalReceived > 0 ? 'Partial' : 'Pending'));

    return {
      id: enr.id,
      studentName: enr.studentName,
      enrollmentNumber: enr.enrollmentNumber || '',
      program: {
        ...enr.program,
        billingCycle: enr.program?.programFeeStructure?.find(
          f => f.admissionSessionId === enr.sessionId && f.organizationId === enr.organizationId
        )?.billingCycle || enr.program?.programFeeStructure?.[0]?.billingCycle
      },
      totalFee,
      baseFee: enr.totalFee || 0,
      extraFees,
      received: totalReceived,
      balance,
      status,
      receipts: enr.studentFeeReceipts,
      createdAt: enr.createdAt
    };
  });

  res.json({ success: true, data: formattedLogs });
});

export const recordReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMode, referenceNo, remarks, receiptDate } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Valid amount is required');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id, organizationId: req.user.organizationId }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  const receipt = await prisma.studentFeeReceipt.create({
    data: {
      organizationId: req.user.organizationId,
      enrollmentId: id,
      amount: Number(amount),
      paymentMode,
      referenceNo,
      remarks,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      recordedBy: req.user.id
    }
  });

  res.status(201).json({ success: true, data: receipt });
});

export const addExtraFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Valid amount is required');
  }
  if (!reason) {
    res.status(400);
    throw new Error('Reason is required');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id, organizationId: req.user.organizationId }
  });

  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  const currentExtraFees = (enrollment.extraFees as any[]) || [];
  const updatedExtraFees = [
    ...currentExtraFees, 
    { amount: Number(amount), reason, date: new Date().toISOString() }
  ];

  await prisma.enrollment.update({
    where: { id },
    data: { extraFees: updatedExtraFees }
  });

  res.json({ success: true, message: 'Extra fee added successfully' });
});
