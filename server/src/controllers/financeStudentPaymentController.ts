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
            select: { billingCycle: true, admissionSessionId: true, organizationId: true, specialisation: true, fullProgramFee: true, feeBreakdown: true, baseFee: true }
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
    const pfs = enr.program?.programFeeStructure || [];
    const feeStruct = pfs.find((f: any) => f.admissionSessionId === enr.sessionId && f.specialisation === enr.specialisation) ||
           pfs.find((f: any) => !f.admissionSessionId && f.specialisation === enr.specialisation) ||
           pfs.find((f: any) => f.admissionSessionId === enr.sessionId && !f.specialisation) ||
           pfs.find((f: any) => !f.admissionSessionId && !f.specialisation) ||
           pfs[0];

    const extraFees = (enr.extraFees as any[]) || [];
    const totalExtraFees = extraFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    let calculatedFullFee = 0;
    if (enr.paymentType === 'full_payment') {
      calculatedFullFee = feeStruct?.fullProgramFee || 0;
    } else if (feeStruct?.feeBreakdown && Array.isArray(feeStruct.feeBreakdown) && feeStruct.feeBreakdown.length > 0) {
      calculatedFullFee = feeStruct.feeBreakdown.reduce((sum: number, b: any) => {
        const semTotal = Number(b.baseFee || 0) + Number(b.examFee || 0) + (Array.isArray(b.additionalFees) ? b.additionalFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) : 0);
        return sum + semTotal;
      }, 0);
    }
    
    const fullProgramFee = calculatedFullFee > 0 ? calculatedFullFee : (feeStruct?.baseFee || enr.totalFee || 0);
    const totalFee = fullProgramFee + totalExtraFees;
    
    // Sum receipts + initial wallet payment
    const manualReceipts = enr.studentFeeReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const walletPayment = (enr.paymentType === 'direct_to_university' ? 0 : enr.totalFee) || 0;
    const totalReceived = manualReceipts + walletPayment;
    const balance = totalFee - totalReceived;
    
    const status = totalFee === 0 ? 'No Fee Set' : (balance <= 0 ? 'Paid' : (totalReceived > 0 ? 'Partial' : 'Pending'));

    return {
      id: enr.id,
      studentName: enr.studentName,
      enrollmentNumber: enr.enrollmentNumber || '',
      paymentType: enr.paymentType,
      program: {
        ...enr.program,
        billingCycle: feeStruct?.billingCycle
      },
      totalFee,
      baseFee: fullProgramFee,
      feeBreakdown: feeStruct?.feeBreakdown || [],
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
