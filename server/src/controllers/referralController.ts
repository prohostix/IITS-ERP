// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';

export const generateReferralLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const slug = req.body.customSlug || `${req.user.name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
  const link = await prisma.referralLink.create({
    data: { organizationId: req.user.organizationId, userId: req.user.id, employeeName: req.user.name, slug, fullUrl: `${process.env.FRONTEND_URL}/referral/${slug}`, status: 'active' as any }
  });
  res.status(201).json({ success: true, data: link });
});

export const getMyReferralLinks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const links = await prisma.referralLink.findMany({ where: { userId: req.user.id } });
  res.json({ success: true, count: links.length, data: links });
});

export const getAllReferralLinks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const links = await prisma.referralLink.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: links.length, data: links });
});

export const updateReferralLinkStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const link = await prisma.referralLink.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json({ success: true, data: link });
});

export const getReferredCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId, referredById: req.user.id } });
  res.json({ success: true, count: centers.length, data: centers });
});

export const getReferredStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

export const getReferralMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

export const validateReferralSlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const link = await prisma.referralLink.findUnique({ where: { slug: req.params.slug } });
  res.json({ success: true, data: link });
});

export const getReferralLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});
