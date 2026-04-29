import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSessionRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const requests = await prisma.sessionRequest.findMany({ where: { organizationId: req.user.organizationId }, include: { center: true } });
  res.json({ success: true, count: requests.length, data: requests });
});

export const getSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.sessionRequest.findUnique({ where: { id: req.params.id }, include: { center: true } });
  res.json({ success: true, data: request });
});

export const createSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.sessionRequest.create({ data: { ...req.body, organizationId: req.user.organizationId, requestedBy: req.user.id } });
  res.status(201).json({ success: true, data: request });
});

export const approveSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.sessionRequest.update({ where: { id: req.params.id }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
  res.json({ success: true, data: request });
});

export const rejectSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.sessionRequest.update({ where: { id: req.params.id }, data: { status: 'rejected', rejectionReason: req.body.remarks } });
  res.json({ success: true, data: request });
});

export const getSessionRequestStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
