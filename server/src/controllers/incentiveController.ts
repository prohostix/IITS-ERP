import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import IncentiveStructure from '../models/IncentiveStructure.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Create incentive structure
// @route   POST /api/v1/incentives
// @access  Private (finance_admin)
export const createIncentiveStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    name,
    targetType,
    applicableTo,
    tiers,
    period,
    effectiveFrom,
    effectiveTo,
  } = req.body;

  // Validate tiers
  if (!tiers || tiers.length === 0) {
    res.status(400);
    throw new Error('At least one tier is required');
  }

  // Ensure tiers are sorted by threshold
  tiers.sort((a: any, b: any) => a.threshold - b.threshold);

  const incentiveStructure = await IncentiveStructure.create({
    organizationId: req.user.organizationId,
    name,
    targetType,
    applicableTo,
    tiers,
    period,
    status: 'draft',
    effectiveFrom,
    effectiveTo,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: incentiveStructure,
  });
});

// @desc    Get all incentive structures
// @route   GET /api/v1/incentives
// @access  Private (finance_admin, hr_admin)
export const getIncentiveStructures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, targetType, applicableTo } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
  };

  if (status) {
    query.status = status;
  }

  if (targetType) {
    query.targetType = targetType;
  }

  if (applicableTo) {
    query.applicableTo = applicableTo;
  }

  const structures = await IncentiveStructure.find(query)
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: structures.length,
    data: structures,
  });
});

// @desc    Get single incentive structure
// @route   GET /api/v1/incentives/:id
// @access  Private
export const getIncentiveStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const structure = await IncentiveStructure.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!structure) {
    res.status(404);
    throw new Error('Incentive structure not found');
  }

  res.json({
    success: true,
    data: structure,
  });
});

// @desc    Update incentive structure
// @route   PATCH /api/v1/incentives/:id
// @access  Private (finance_admin)
export const updateIncentiveStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    name,
    tiers,
    effectiveTo,
    status,
  } = req.body;

  const structure = await IncentiveStructure.findById(req.params.id);

  if (!structure) {
    res.status(404);
    throw new Error('Incentive structure not found');
  }

  // Can't edit if already active
  if (structure.status === 'active' && status !== 'inactive') {
    res.status(400);
    throw new Error('Cannot edit active incentive structure. Create a new one instead.');
  }

  if (name !== undefined) structure.name = name;
  if (tiers !== undefined) {
    tiers.sort((a: any, b: any) => a.threshold - b.threshold);
    structure.tiers = tiers;
  }
  if (effectiveTo !== undefined) structure.effectiveTo = effectiveTo;
  if (status !== undefined) structure.status = status;

  await structure.save();

  res.json({
    success: true,
    data: structure,
  });
});

// @desc    Approve incentive structure
// @route   PATCH /api/v1/incentives/:id/approve
// @access  Private (finance_admin)
export const approveIncentiveStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const structure = await IncentiveStructure.findById(req.params.id);

  if (!structure) {
    res.status(404);
    throw new Error('Incentive structure not found');
  }

  if (structure.status !== 'draft') {
    res.status(400);
    throw new Error('Only draft structures can be approved');
  }

  structure.status = 'active';
  structure.approvedBy = req.user._id;
  structure.approvedAt = new Date();

  await structure.save();

  res.json({
    success: true,
    data: structure,
    message: 'Incentive structure approved and activated',
  });
});

// @desc    Delete incentive structure
// @route   DELETE /api/v1/incentives/:id
// @access  Private (finance_admin)
export const deleteIncentiveStructure = asyncHandler(async (req: AuthRequest, res: Response) => {
  const structure = await IncentiveStructure.findById(req.params.id);

  if (!structure) {
    res.status(404);
    throw new Error('Incentive structure not found');
  }

  if (structure.status === 'active') {
    res.status(400);
    throw new Error('Cannot delete active incentive structure. Deactivate it first.');
  }

  await structure.deleteOne();

  res.json({
    success: true,
    message: 'Incentive structure deleted',
  });
});

// @desc    Calculate incentive for given achievement
// @route   POST /api/v1/incentives/calculate
// @access  Private
export const calculateIncentive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { structureId, achievedValue } = req.body;

  if (!structureId || achievedValue === undefined) {
    res.status(400);
    throw new Error('Structure ID and achieved value are required');
  }

  const structure = await IncentiveStructure.findById(structureId);

  if (!structure) {
    res.status(404);
    throw new Error('Incentive structure not found');
  }

  if (structure.status !== 'active') {
    res.status(400);
    throw new Error('Incentive structure is not active');
  }

  // Find applicable tier
  let applicableTier = null;
  for (let i = structure.tiers.length - 1; i >= 0; i--) {
    if (achievedValue >= structure.tiers[i].threshold) {
      applicableTier = structure.tiers[i];
      break;
    }
  }

  if (!applicableTier) {
    res.json({
      success: true,
      data: {
        achievedValue,
        incentiveAmount: 0,
        tier: null,
        message: 'No tier threshold met',
      },
    });
    return;
  }

  let incentiveAmount = 0;
  if (applicableTier.incentivePercentage) {
    incentiveAmount = (achievedValue * applicableTier.incentivePercentage) / 100;
  } else if (applicableTier.fixedAmount) {
    incentiveAmount = applicableTier.fixedAmount;
  }

  res.json({
    success: true,
    data: {
      achievedValue,
      incentiveAmount: Math.round(incentiveAmount * 100) / 100,
      tier: applicableTier,
      structureName: structure.name,
    },
  });
});

// @desc    Get active incentive structures for current period
// @route   GET /api/v1/incentives/active/current
// @access  Private
export const getCurrentActiveIncentives = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();

  const structures = await IncentiveStructure.find({
    organizationId: req.user.organizationId,
    status: 'active',
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: now } },
    ],
  })
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  res.json({
    success: true,
    count: structures.length,
    data: structures,
  });
});
