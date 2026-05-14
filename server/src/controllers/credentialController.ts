import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCredentialRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const requests = await prisma.credentialRequest.findMany({
    where: { organizationId: req.user.organizationId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: requests.length, data: requests });
});

export const getCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.credentialRequest.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: request });
});

export const submitCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.credentialRequest.create({ data: { ...req.body, organizationId: req.user.organizationId, requesterId: req.user.id } });
  res.status(201).json({ success: true, data: request });
});

export const respondToCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await prisma.credentialRequest.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: request });
});

export const getCredentialStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});
