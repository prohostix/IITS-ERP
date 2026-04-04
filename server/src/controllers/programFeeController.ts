import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import ProgramFeeStructure from '../models/ProgramFeeStructure.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProgramFees = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.programId) query.programId = req.query.programId;

  const fees = await ProgramFeeStructure.find(query)
    .populate('programId', 'name code courseType')
    .populate('createdBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: fees.length, data: fees });
});

export const getProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await ProgramFeeStructure.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  }).populate('programId', 'name code');

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: fee });
});

export const createProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId, billingCycle, baseFee, additionalFees } = req.body;

  if (!billingCycle) {
    res.status(400).json({ success: false, message: 'billingCycle must be one of: per_semester, per_year, total' });
    return;
  }
  if (baseFee === undefined || baseFee === null || baseFee < 0) {
    res.status(400).json({ success: false, message: 'baseFee must be a non-negative number' });
    return;
  }
  if (additionalFees && Array.isArray(additionalFees)) {
    for (let i = 0; i < additionalFees.length; i++) {
      if (!additionalFees[i].label || additionalFees[i].label.trim() === '') {
        res.status(400).json({ success: false, message: `additionalFees[${i}].label must not be empty` });
        return;
      }
    }
  }

  // Check for duplicate
  const existing = await ProgramFeeStructure.findOne({ programId, organizationId: req.user.organizationId });
  if (existing) {
    res.status(409).json({ success: false, message: 'A fee structure already exists for this program' });
    return;
  }

  const fee = await ProgramFeeStructure.create({
    programId,
    organizationId: req.user.organizationId,
    billingCycle,
    baseFee,
    additionalFees: additionalFees || [],
    createdBy: req.user._id,
  });

  await fee.populate('programId', 'name code');
  res.status(201).json({ success: true, data: fee });
});

export const updateProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { billingCycle, baseFee, additionalFees } = req.body;

  if (baseFee !== undefined && baseFee < 0) {
    res.status(400).json({ success: false, message: 'baseFee must be a non-negative number' });
    return;
  }
  if (additionalFees && Array.isArray(additionalFees)) {
    for (let i = 0; i < additionalFees.length; i++) {
      if (!additionalFees[i].label || additionalFees[i].label.trim() === '') {
        res.status(400).json({ success: false, message: `additionalFees[${i}].label must not be empty` });
        return;
      }
    }
  }

  const fee = await ProgramFeeStructure.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true, runValidators: true }
  ).populate('programId', 'name code');

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: fee });
});

export const deleteProgramFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fee = await ProgramFeeStructure.findOneAndDelete({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee structure not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});
