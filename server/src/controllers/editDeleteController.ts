import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const submitEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.editDeleteRequest.create({
    data: { ...req.body, organizationId: req.user.organizationId, requesterId: req.user.id, requesterName: req.user.name, status: 'pending' }
  });
  res.status(201).json({ success: true, data: request });
});

export const getEditDeleteRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const requests = await prisma.editDeleteRequest.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: requests.length, data: requests });
});

export const getEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.editDeleteRequest.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: request });
});

export const respondToEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.editDeleteRequest.update({
    where: { id: req.params.id },
    data: { ...req.body, respondedById: req.user.id, respondedAt: new Date() }
  });
  res.json({ success: true, data: request });
});

export const getEditDeleteStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
