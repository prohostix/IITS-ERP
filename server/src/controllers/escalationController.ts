import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({
    where: { organizationId: req.user.organizationId },
    include: { raisedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: escalations.length, data: escalations });
});

export const getEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: escalation });
});

export const createEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.create({ data: { ...req.body, organizationId: req.user.organizationId, raisedById: req.user.id } });
  res.status(201).json({ success: true, data: escalation });
});

export const updateEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: escalation });
});

export const deleteEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.escalation.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const resolveEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: { status: 'resolved', resolvedAt: new Date(), resolvedById: req.user.id } });
  res.json({ success: true, data: escalation });
});
