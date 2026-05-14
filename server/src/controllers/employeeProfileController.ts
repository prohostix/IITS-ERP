import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await prisma.user.findUnique({
    where: { id: req.params.userId || req.user.id },
    include: { organization: true, department: true }
  });
  res.json({ success: true, data: profile });
});

export const upsertEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const profile = await prisma.user.update({
    where: { id: userId },
    data: req.body
  });
  res.json({ success: true, data: profile });
});

export const updateKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kpis: req.body.kpis },
    create: { userId, organizationId: req.user.organizationId, kpis: req.body.kpis }
  });
  res.json({ success: true, data: profile });
});

export const updateKRAs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kras: req.body.kras },
    create: { userId, organizationId: req.user.organizationId, kras: req.body.kras }
  });
  res.json({ success: true, data: profile });
});

export const updateSalaryDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const config = await prisma.salaryConfig.upsert({
    where: { userId },
    update: req.body,
    create: { ...req.body, userId, organizationId: req.user.organizationId, createdBy: req.user.id }
  });
  res.json({ success: true, data: config });
});
