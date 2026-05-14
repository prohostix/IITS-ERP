import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import GSTSetting from '../models/GSTSetting.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Create GST setting
// @route   POST /api/v1/gst/settings
// @access  Private (finance_admin)
export const createGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    feeType,
    gstPercentage,
    hsnCode,
    sacCode,
    applicableFrom,
    applicableTo,
    allowOverride,
  } = req.body;

  // Check if active setting exists for this fee type
  const existingActive = await GSTSetting.findOne({
    organizationId: req.user.organizationId,
    feeType,
    status: 'active',
    $or: [
      { applicableTo: { $exists: false } },
      { applicableTo: { $gte: new Date() } },
    ],
  });

  if (existingActive) {
    res.status(400);
    throw new Error(`Active GST setting already exists for fee type: ${feeType}`);
  }

  const gstSetting = await GSTSetting.create({
    organizationId: req.user.organizationId,
    feeType,
    gstPercentage,
    hsnCode,
    sacCode,
    applicableFrom,
    applicableTo,
    allowOverride,
    status: 'active',
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: gstSetting,
  });
});

// @desc    Get all GST settings
// @route   GET /api/v1/gst/settings
// @access  Private (finance_admin, ops_admin)
export const getGSTSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, feeType } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
  };

  if (status) {
    query.status = status;
  }

  if (feeType) {
    query.feeType = feeType;
  }

  const settings = await GSTSetting.find(query)
    .populate('createdBy', 'name email')
    .sort({ applicableFrom: -1 });

  res.json({
    success: true,
    count: settings.length,
    data: settings,
  });
});

// @desc    Get single GST setting
// @route   GET /api/v1/gst/settings/:id
// @access  Private (finance_admin, ops_admin)
export const getGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await GSTSetting.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!setting) {
    res.status(404);
    throw new Error('GST setting not found');
  }

  res.json({
    success: true,
    data: setting,
  });
});

// @desc    Update GST setting
// @route   PATCH /api/v1/gst/settings/:id
// @access  Private (finance_admin)
export const updateGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    gstPercentage,
    hsnCode,
    sacCode,
    applicableTo,
    allowOverride,
    status,
  } = req.body;

  const setting = await GSTSetting.findById(req.params.id);

  if (!setting) {
    res.status(404);
    throw new Error('GST setting not found');
  }

  if (gstPercentage !== undefined) setting.gstPercentage = gstPercentage;
  if (hsnCode !== undefined) setting.hsnCode = hsnCode;
  if (sacCode !== undefined) setting.sacCode = sacCode;
  if (applicableTo !== undefined) setting.applicableTo = applicableTo;
  if (allowOverride !== undefined) setting.allowOverride = allowOverride;
  if (status !== undefined) setting.status = status;

  await setting.save();

  res.json({
    success: true,
    data: setting,
  });
});

// @desc    Delete GST setting
// @route   DELETE /api/v1/gst/settings/:id
// @access  Private (finance_admin)
export const deleteGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await GSTSetting.findById(req.params.id);

  if (!setting) {
    res.status(404);
    throw new Error('GST setting not found');
  }

  // Soft delete by marking as inactive
  setting.status = 'inactive';
  await setting.save();

  res.json({
    success: true,
    message: 'GST setting deactivated',
  });
});

// @desc    Get applicable GST for fee type
// @route   GET /api/v1/gst/applicable/:feeType
// @access  Private
export const getApplicableGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { feeType } = req.params;
  const { date } = req.query;

  const applicableDate = date ? new Date(date as string) : new Date();

  const setting = await GSTSetting.findOne({
    organizationId: req.user.organizationId,
    feeType,
    status: 'active',
    applicableFrom: { $lte: applicableDate },
    $or: [
      { applicableTo: { $exists: false } },
      { applicableTo: { $gte: applicableDate } },
    ],
  }).sort({ applicableFrom: -1 });

  if (!setting) {
    res.status(404);
    throw new Error(`No GST setting found for fee type: ${feeType}`);
  }

  res.json({
    success: true,
    data: setting,
  });
});

// @desc    Calculate GST amount
// @route   POST /api/v1/gst/calculate
// @access  Private
export const calculateGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { feeType, baseAmount, date } = req.body;

  if (!feeType || !baseAmount) {
    res.status(400);
    throw new Error('Fee type and base amount are required');
  }

  const applicableDate = date ? new Date(date) : new Date();

  const setting = await GSTSetting.findOne({
    organizationId: req.user.organizationId,
    feeType,
    status: 'active',
    applicableFrom: { $lte: applicableDate },
    $or: [
      { applicableTo: { $exists: false } },
      { applicableTo: { $gte: applicableDate } },
    ],
  }).sort({ applicableFrom: -1 });

  if (!setting) {
    res.status(404);
    throw new Error(`No GST setting found for fee type: ${feeType}`);
  }

  const gstAmount = (baseAmount * setting.gstPercentage) / 100;
  const totalAmount = baseAmount + gstAmount;

  res.json({
    success: true,
    data: {
      feeType,
      baseAmount,
      gstPercentage: setting.gstPercentage,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      hsnCode: setting.hsnCode,
      sacCode: setting.sacCode,
    },
  });
});

// @desc    Get GST summary by fee type
// @route   GET /api/v1/gst/summary
// @access  Private (finance_admin)
export const getGSTSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await GSTSetting.find({
    organizationId: req.user.organizationId,
    status: 'active',
  });

  const summary = settings.map((setting) => ({
    feeType: setting.feeType,
    gstPercentage: setting.gstPercentage,
    applicableFrom: setting.applicableFrom,
    applicableTo: setting.applicableTo,
  }));

  res.json({
    success: true,
    count: summary.length,
    data: summary,
  });
});
