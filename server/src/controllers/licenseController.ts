import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getLicenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const licenses = await prisma.license.findMany();
  res.status(200).json({ success: true, count: licenses.length, data: licenses });
});

export const getLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await prisma.license.findUnique({ where: { id: req.params.id } });
  if (!license) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  res.status(200).json({ success: true, data: license });
});

export const createLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await prisma.license.create({ data: req.body });
  res.status(201).json({ success: true, data: license });
});

export const updateLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.license.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  const license = await prisma.license.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: license });
});

export const deleteLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.license.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  await prisma.license.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});
