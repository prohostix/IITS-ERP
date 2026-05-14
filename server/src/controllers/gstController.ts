import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.create({ data: { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id } });
  res.status(201).json({ success: true, data: setting });
});

export const getGSTSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.gSTSetting.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: settings.length, data: settings });
});

export const getGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: setting });
});

export const updateGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: setting });
});

export const deleteGSTSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.gSTSetting.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const getApplicableGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const setting = await prisma.gSTSetting.findFirst({ where: { organizationId: req.user.organizationId, feeType: req.params.feeType, status: 'active' as any } });
  res.json({ success: true, data: setting });
});

export const calculateGST = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, feeType } = req.body;
  const setting = await prisma.gSTSetting.findFirst({ where: { organizationId: req.user.organizationId, feeType, status: 'active' as any } });
  const percentage = setting ? setting.gstPercentage : 0;
  const gstAmount = (amount * percentage) / 100;
  res.json({ success: true, data: { amount, percentage, gstAmount, totalAmount: amount + gstAmount } });
});

export const getGSTSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
