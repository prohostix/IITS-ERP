import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// --- Escalation Controller ---
export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: escalations.length, data: escalations });
});

// --- Credential Controller ---
export const getCredentialRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const requests = await prisma.credentialRequest.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: requests.length, data: requests });
});

// --- Enrollment Review Controller ---
export const getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { 
      orgId: req.user.organizationId,
      status: 'document_review'
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});

// --- Session Request Controller ---
export const getSessionRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const requests = await prisma.sessionRequest.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: requests.length, data: requests });
});

// --- Finance Enrollment Controller ---
export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { orgId: req.user.organizationId },
    include: {
      program: true,
      center: true
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: enrollments.length, data: enrollments });
});
