import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import ReferralLink from '../models/ReferralLink.js';
import StudyCenter from '../models/StudyCenter.js';
import Student from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';

// @desc    Generate referral link for BDE
// @route   POST /api/v1/referrals/generate
// @access  Private (sales_admin, bde)
export const generateReferralLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customSlug } = req.body;

  // Check if user already has an active link
  const existingLink = await ReferralLink.findOne({
    employeeId: req.user._id,
    status: 'active',
  });

  if (existingLink) {
    res.status(400);
    throw new Error('You already have an active referral link');
  }

  // Generate unique slug
  let slug = customSlug || `${req.user.name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
  
  // Ensure slug is unique
  const slugExists = await ReferralLink.findOne({ slug });
  if (slugExists) {
    slug = `${slug}-${crypto.randomBytes(4).toString('hex')}`;
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5194';
  const fullUrl = `${baseUrl}/referral/${slug}`;

  const referralLink = await ReferralLink.create({
    organizationId: req.user.organizationId,
    employeeId: req.user._id,
    employeeName: req.user.name,
    slug,
    fullUrl,
    status: 'active',
    metrics: {
      centersReferred: 0,
      studentsReferred: 0,
      revenueGenerated: 0,
    },
  });

  res.status(201).json({
    success: true,
    data: referralLink,
  });
});

// @desc    Get user's referral links
// @route   GET /api/v1/referrals/my-links
// @access  Private (sales_admin, bde)
export const getMyReferralLinks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const links = await ReferralLink.find({
    employeeId: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: links.length,
    data: links,
  });
});

// @desc    Get all referral links (Admin only)
// @route   GET /api/v1/referrals/links
// @access  Private (sales_admin)
export const getAllReferralLinks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
  };

  if (status) {
    query.status = status;
  }

  const links = await ReferralLink.find(query)
    .populate('employeeId', 'name email role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: links.length,
    data: links,
  });
});

// @desc    Update referral link status
// @route   PATCH /api/v1/referrals/links/:id
// @access  Private (sales_admin)
export const updateReferralLinkStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    res.status(400);
    throw new Error('Status must be active or inactive');
  }

  const link = await ReferralLink.findById(req.params.id);

  if (!link) {
    res.status(404);
    throw new Error('Referral link not found');
  }

  link.status = status;
  await link.save();

  res.json({
    success: true,
    data: link,
  });
});

// @desc    Get centers referred by user
// @route   GET /api/v1/referrals/centers
// @access  Private (sales_admin, bde)
export const getReferredCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await StudyCenter.find({
    organizationId: req.user.organizationId,
    referredBy: req.user._id,
  })
    .populate('universityId', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: centers.length,
    data: centers,
  });
});

// @desc    Get students referred by user
// @route   GET /api/v1/referrals/students
// @access  Private (sales_admin, bde)
export const getReferredStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await Student.find({
    organizationId: req.user.organizationId,
    referredBy: req.user._id,
  })
    .populate('programId', 'name')
    .populate('universityId', 'name')
    .populate('studyCenterId', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: students.length,
    data: students,
  });
});

// @desc    Get referral metrics for user
// @route   GET /api/v1/referrals/metrics
// @access  Private (sales_admin, bde)
export const getReferralMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const link = await ReferralLink.findOne({
    employeeId: req.user._id,
    status: 'active',
  });

  // No active link — return empty metrics instead of throwing
  if (!link) {
    return res.json({
      success: true,
      data: null,
    });
  }

  // Get detailed metrics
  const centersCount = await StudyCenter.countDocuments({
    organizationId: req.user.organizationId,
    referredBy: req.user._id,
  });

  const studentsCount = await Student.countDocuments({
    organizationId: req.user.organizationId,
    referredBy: req.user._id,
  });

  let totalRevenue = 0;

  // Update link metrics
  link.metrics.centersReferred = centersCount;
  link.metrics.studentsReferred = studentsCount;
  link.metrics.revenueGenerated = totalRevenue;
  await link.save();

  res.json({
    success: true,
    data: {
      link: link.fullUrl,
      metrics: link.metrics,
      breakdown: {
        centers: centersCount,
        students: studentsCount,
        revenue: totalRevenue,
      },
    },
  });
});

// @desc    Validate referral slug (public endpoint)
// @route   GET /api/v1/referrals/validate/:slug
// @access  Public
export const validateReferralSlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const link = await ReferralLink.findOne({ slug, status: 'active' })
    .populate('employeeId', 'name email');

  if (!link) {
    res.status(404);
    throw new Error('Invalid or inactive referral link');
  }

  // Update last used
  link.metrics.lastUsed = new Date();
  await link.save();

  res.json({
    success: true,
    data: {
      valid: true,
      employeeName: link.employeeName,
      employeeId: link.employeeId,
    },
  });
});

// @desc    Get referral leaderboard
// @route   GET /api/v1/referrals/leaderboard
// @access  Private (sales_admin)
export const getReferralLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { period = 'all' } = req.query;

  const links = await ReferralLink.find({
    organizationId: req.user.organizationId,
    status: 'active',
  })
    .populate('employeeId', 'name email')
    .sort({ 'metrics.revenueGenerated': -1 })
    .limit(10);

  res.json({
    success: true,
    data: links,
  });
});
