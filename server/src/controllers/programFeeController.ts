// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProgramFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fees = await prisma.programFeeStructure.findMany({
    where: { organizationId: req.user.organizationId },
    include: { 
      program: true,
      university: true,
      admissionSession: true
    }
  });
  const mapped = fees.map(fee => ({
    ...fee,
    programId: fee.program || fee.programId,
    effectiveFrom: fee.createdAt
  }));
  res.json({ success: true, count: mapped.length, data: mapped });
});

export const getProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await prisma.programFeeStructure.findUnique({
    where: { id: req.params.id },
    include: { 
      program: true,
      university: true,
      admissionSession: true
    }
  });
  if (fee) {
    const mapped = {
      ...fee,
      programId: fee.program || fee.programId,
      effectiveFrom: fee.createdAt
    };
    res.json({ success: true, data: mapped });
  } else {
    res.status(404).json({ success: false, message: 'Program fee structure not found' });
  }
});

export const createProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { level, programId, universityId, admissionSessionId, billingCycle, baseFee, universityFee, additionalFees, commissionRate, currency, feeBreakdown } = req.body;

  // For program level, check if structure already exists
  if (level === 'program' && programId) {
    const existing = await prisma.programFeeStructure.findFirst({ 
      where: { 
        level: 'program', 
        programId,
        admissionSessionId: admissionSessionId || null
      } 
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Program fee structure already exists for this program and session. Please edit the existing one.' });
      return;
    }
  } else if (level === 'university' && universityId) {
    const existing = await prisma.programFeeStructure.findFirst({ 
      where: { 
        level: 'university', 
        universityId,
        admissionSessionId: admissionSessionId || null
      } 
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'University fee structure already exists for this university and session. Please edit the existing one.' });
      return;
    }
  }

  const fee = await prisma.programFeeStructure.create({
    data: {
      level: level || 'program',
      programId: level === 'program' ? programId : null,
      universityId: universityId || null,
      admissionSessionId: admissionSessionId || null,
      billingCycle,
      baseFee: baseFee !== undefined ? parseFloat(baseFee) : 0,
      universityFee: universityFee !== undefined ? parseFloat(universityFee) : 0,
      additionalFees: additionalFees || [],
      feeBreakdown: feeBreakdown || [],
      currency: currency || 'INR',
      commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : 0,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    }
  });
  res.status(201).json({ success: true, data: fee });
});

export const updateProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { level, programId, universityId, admissionSessionId, billingCycle, baseFee, universityFee, additionalFees, commissionRate, currency, feeBreakdown } = req.body;
  const data: any = {};
  if (level !== undefined) data.level = level;
  if (programId !== undefined) data.programId = level === 'program' ? programId : null;
  if (universityId !== undefined) data.universityId = universityId || null;
  if (admissionSessionId !== undefined) data.admissionSessionId = admissionSessionId || null;
  if (billingCycle !== undefined) data.billingCycle = billingCycle;
  if (baseFee !== undefined) data.baseFee = parseFloat(baseFee);
  if (universityFee !== undefined) data.universityFee = parseFloat(universityFee);
  if (additionalFees !== undefined) data.additionalFees = additionalFees;
  if (feeBreakdown !== undefined) data.feeBreakdown = feeBreakdown;
  if (currency !== undefined) data.currency = currency;
  if (commissionRate !== undefined) data.commissionRate = parseFloat(commissionRate);

  const fee = await prisma.programFeeStructure.update({
    where: { id: req.params.id },
    data
  });
  res.json({ success: true, data: fee });
});

export const deleteProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programFeeStructure.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
