import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Organization from '../models/Organization.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all organizations (superadmin sees all, others see only their own)
// @route   GET /api/v1/organizations
// @access  Private
export const getOrganizations = asyncHandler(async (req: AuthRequest, res: Response) => {
  let query: any = {};

  // Non-superadmins only see their own organization
  if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
    query._id = req.user.organizationId;
  }

  const organizations = await Organization.find(query).populate('licenseId');

  res.status(200).json({
    success: true,
    count: organizations.length,
    data: organizations,
  });
});

// @desc    Get single organization
// @route   GET /api/v1/organizations/:id
// @access  Private
export const getOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await Organization.findById(req.params.id).populate('licenseId');

  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: organization,
  });
});

// @desc    Create organization
// @route   POST /api/v1/organizations
// @access  Private (Superadmin)
export const createOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await Organization.create(req.body);

  res.status(201).json({
    success: true,
    data: organization,
  });
});

// @desc    Update organization
// @route   PUT /api/v1/organizations/:id
// @access  Private (Superadmin/OrgAdmin)
export const updateOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await Organization.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: organization,
  });
});

// @desc    Delete organization
// @route   DELETE /api/v1/organizations/:id
// @access  Private (Superadmin)
export const deleteOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await Organization.findByIdAndDelete(req.params.id);

  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Assign license to organization
// @route   PUT /api/v1/organizations/:id/license
// @access  Private (Superadmin)
export const assignLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { licenseId, durationMonths } = req.body;

  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  organization.licenseId = licenseId;
  organization.licenseExpiry = expiryDate;
  await organization.save();

  res.status(200).json({
    success: true,
    data: organization,
  });
});
