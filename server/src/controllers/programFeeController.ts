// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cleanId = (val: any): string | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '__none__' || trimmed === 'none' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  return trimmed;
};

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
    universityId: fee.university || fee.universityId,
    admissionSessionId: fee.admissionSession || fee.admissionSessionId,
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
      universityId: fee.university || fee.universityId,
      admissionSessionId: fee.admissionSession || fee.admissionSessionId,
      effectiveFrom: fee.createdAt
    };
    res.json({ success: true, data: mapped });
  } else {
    res.status(404).json({ success: false, message: 'Program fee structure not found' });
  }
});

export const createProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { level, programId, universityId, admissionSessionId, specialisation, billingCycle, baseFee, universityFee, additionalFees, commissionRate, currency, feeBreakdown } = req.body;

  const feeLevel = level || 'program';
  let cleanProgId = feeLevel === 'program' ? cleanId(programId) : null;
  let cleanUniId = cleanId(universityId);
  let cleanSessionId = cleanId(admissionSessionId);
  const cleanSpec = cleanId(specialisation);

  // Validate foreign key existence to avoid Postgres FK constraint violations
  if (cleanSessionId) {
    const sessionExists = await prisma.admissionSession.findUnique({
      where: { id: cleanSessionId },
      select: { id: true }
    });
    if (!sessionExists) cleanSessionId = null;
  }

  if (cleanUniId) {
    const uniExists = await prisma.university.findUnique({
      where: { id: cleanUniId },
      select: { id: true }
    });
    if (!uniExists) cleanUniId = null;
  }

  if (cleanProgId) {
    const prog = await prisma.program.findUnique({
      where: { id: cleanProgId },
      select: { id: true, universityId: true }
    });
    if (!prog) {
      res.status(400).json({ success: false, message: 'Selected program does not exist.' });
      return;
    }
    if (!cleanUniId && prog.universityId) {
      cleanUniId = prog.universityId;
    }
  }

  // Check if structure already exists
  if (feeLevel === 'program' && cleanProgId) {
    const existing = await prisma.programFeeStructure.findFirst({ 
      where: { 
        organizationId: req.user.organizationId,
        level: 'program', 
        programId: cleanProgId,
        admissionSessionId: cleanSessionId,
        specialisation: cleanSpec
      } 
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Program fee structure already exists for this program, session, and specialisation. Please edit the existing one.' });
      return;
    }
  } else if (feeLevel === 'university' && cleanUniId) {
    const existing = await prisma.programFeeStructure.findFirst({ 
      where: { 
        organizationId: req.user.organizationId,
        level: 'university', 
        universityId: cleanUniId,
        admissionSessionId: cleanSessionId
      } 
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'University fee structure already exists for this university and session. Please edit the existing one.' });
      return;
    }
  }

  const fee = await prisma.programFeeStructure.create({
    data: {
      level: feeLevel,
      programId: cleanProgId,
      universityId: cleanUniId,
      admissionSessionId: cleanSessionId,
      specialisation: cleanSpec,
      billingCycle: billingCycle || 'per_year',
      baseFee: baseFee !== undefined ? parseFloat(baseFee) : 0,
      fullProgramFee: req.body.fullProgramFee !== undefined ? parseFloat(req.body.fullProgramFee) : 0,
      oneTimeUniversityFee: req.body.oneTimeUniversityFee !== undefined ? parseFloat(req.body.oneTimeUniversityFee) : 0,
      oneTimeCommission: req.body.oneTimeCommission !== undefined ? parseFloat(req.body.oneTimeCommission) : 0,
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
  const { level, programId, universityId, admissionSessionId, specialisation, billingCycle, baseFee, fullProgramFee, universityFee, additionalFees, commissionRate, currency, feeBreakdown } = req.body;
  const data: any = {};
  const existingFee = await prisma.programFeeStructure.findUnique({ where: { id: req.params.id } });
  if (!existingFee) {
    return res.status(404).json({ success: false, message: 'Fee structure not found' });
  }

  const currentLevel = level !== undefined ? level : existingFee.level;
  if (level !== undefined) data.level = level;
  if (fullProgramFee !== undefined) data.fullProgramFee = parseFloat(fullProgramFee);
  if (req.body.oneTimeUniversityFee !== undefined) data.oneTimeUniversityFee = parseFloat(req.body.oneTimeUniversityFee);
  if (req.body.oneTimeCommission !== undefined) data.oneTimeCommission = parseFloat(req.body.oneTimeCommission);

  if (currentLevel === 'program') {
    if (programId !== undefined) {
      let cleanProgId = cleanId(programId);
      if (cleanProgId) {
        const progExists = await prisma.program.findUnique({ where: { id: cleanProgId }, select: { id: true } });
        if (!progExists) cleanProgId = null;
      }
      data.programId = cleanProgId;
    }
  } else {
    data.programId = null;
  }
  
  if (universityId !== undefined) {
    let cleanUniId = cleanId(universityId);
    if (cleanUniId) {
      const uniExists = await prisma.university.findUnique({ where: { id: cleanUniId }, select: { id: true } });
      if (!uniExists) cleanUniId = null;
    }
    data.universityId = cleanUniId;
  }

  if (admissionSessionId !== undefined) {
    let cleanSessId = cleanId(admissionSessionId);
    if (cleanSessId) {
      const sessExists = await prisma.admissionSession.findUnique({ where: { id: cleanSessId }, select: { id: true } });
      if (!sessExists) cleanSessId = null;
    }
    data.admissionSessionId = cleanSessId;
  }
  
  if (specialisation !== undefined) {
    data.specialisation = cleanId(specialisation);
  }
  if (billingCycle !== undefined) data.billingCycle = billingCycle;
  if (baseFee !== undefined) data.baseFee = parseFloat(baseFee);
  if (universityFee !== undefined) data.universityFee = parseFloat(universityFee);
  if (additionalFees !== undefined) data.additionalFees = additionalFees;
  if (feeBreakdown !== undefined) data.feeBreakdown = feeBreakdown;
  if (currency !== undefined) data.currency = currency;
  if (commissionRate !== undefined) data.commissionRate = parseFloat(commissionRate);

  const checkLevel = currentLevel;
  const checkProgramId = data.programId !== undefined ? data.programId : existingFee.programId;
  const checkSession = data.admissionSessionId !== undefined ? data.admissionSessionId : existingFee.admissionSessionId;
  const checkSpec = data.specialisation !== undefined ? data.specialisation : existingFee.specialisation;
  const checkUni = data.universityId !== undefined ? data.universityId : existingFee.universityId;

  if (checkLevel === 'program' && checkProgramId) {
    const duplicate = await prisma.programFeeStructure.findFirst({
      where: {
        id: { not: req.params.id },
        organizationId: req.user.organizationId,
        level: 'program',
        programId: checkProgramId,
        admissionSessionId: checkSession,
        specialisation: checkSpec
      }
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Program fee structure already exists for this program, session, and specialisation.' });
    }
  } else if (checkLevel === 'university' && checkUni) {
    const duplicate = await prisma.programFeeStructure.findFirst({
      where: {
        id: { not: req.params.id },
        organizationId: req.user.organizationId,
        level: 'university',
        universityId: checkUni,
        admissionSessionId: checkSession
      }
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'University fee structure already exists for this university and session.' });
    }
  }

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
