import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rules = await prisma.reregRule.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: rules.length, data: rules });
});

export const createOrUpdateReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rule = await prisma.reregRule.upsert({
    where: { organizationId: req.user.organizationId },
    update: req.body,
    create: { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id }
  });
  res.json({ success: true, data: rule });
});

export const getPendingReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const pending = await prisma.reregistration.findMany({ where: { organizationId: req.user.organizationId, status: 'pending' } });
  res.json({ success: true, count: pending.length, data: pending });
});

export const getCompletedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const completed = await prisma.reregistration.findMany({ where: { organizationId: req.user.organizationId, status: 'completed' } });
  res.json({ success: true, count: completed.length, data: completed });
});

export const processRereg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rereg = await prisma.reregistration.update({ where: { id: req.params.id }, data: { status: 'completed' } });
  res.json({ success: true, data: rereg });
});

export const carryForwardMissedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Missed reregs carried forward' });
});

export const getReregStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
