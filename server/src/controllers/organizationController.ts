import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOrganizations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizations = await prisma.organization.findMany();
  res.status(200).json({ success: true, count: organizations.length, data: organizations });
});

export const getOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.params.id }
  });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  res.status(200).json({ success: true, data: organization });
});

export const createOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, ...rest } = req.body;
  
  const slug = rest.slug || name.toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '') + '-' + Math.random().toString(36).substring(2, 7);

  const organization = await prisma.organization.create({
    data: {
      ...rest,
      name,
      slug,
      contactEmail: email || rest.contactEmail,
      contactPhone: phone || rest.contactPhone,
    }
  });
  res.status(201).json({ success: true, data: organization });
});

export const updateOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: organization });
});

export const deleteOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  await prisma.organization.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const assignLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { licenseId, durationMonths } = req.body;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const updatedOrg = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      licenseId,
      licenseExpiry: expiryDate,
    }
  });
  res.status(200).json({ success: true, data: updatedOrg });
});
