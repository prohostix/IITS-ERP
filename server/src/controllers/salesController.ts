import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Leads
export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leads = await prisma.lead.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});
export const getLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: lead });
});
export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: lead });
});
export const updateLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: lead });
});
export const deleteLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const convertLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status: 'converted' as any, convertedAt: new Date() } });
  res.json({ success: true, data: lead });
});

// Targets
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targets = await prisma.target.findMany({ where: { organizationId: req.user.organizationId }, include: { employee: true } });
  res.json({ success: true, count: targets.length, data: targets });
});
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: target });
});
export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.target.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Invites
export const listMyInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invites = await prisma.studyCenterInvite.findMany({ where: { referredBy: req.user.id } });
  res.json({ success: true, count: invites.length, data: invites });
});
export const generateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invite = await prisma.studyCenterInvite.create({
    data: { ...req.body, organizationId: req.user.organizationId, referredBy: req.user.id, token: Math.random().toString(36).substring(7).toUpperCase() }
  });
  res.status(201).json({ success: true, data: invite });
});
export const regenerateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invite = await prisma.studyCenterInvite.update({ where: { id: req.params.id }, data: { token: Math.random().toString(36).substring(7).toUpperCase() } });
  res.json({ success: true, data: invite });
});

// Performance
export const getTeamPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

// Study Centers
export const getMyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: centers });
});
export const getMyCenterAdmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});
export const getMyCenterDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({ where: { id: req.params.studyCenterId } });
  res.json({ success: true, data: center });
});

// Programs
export const getProgramsByUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ where: { universityId: req.query.universityId as string } });
  res.json({ success: true, data: programs });
});
