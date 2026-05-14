import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { orgId: req.user.organizationId } }),
    prisma.task.count({ where: { orgId: req.user.organizationId, status: 'completed' } })
  ]);
  res.json({ success: true, data: { taskCompletionRate: total > 0 ? (completed / total) * 100 : 0 } });
});

export const getRiskMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const overdue = await prisma.task.count({ where: { orgId: req.user.organizationId, status: 'overdue' } });
  res.json({ success: true, data: { overdueTasks: overdue } });
});

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({ where: { organizationId: req.user.organizationId }, include: { raisedBy: true } });
  res.json({ success: true, count: escalations.length, data: escalations });
});

export const handleEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await prisma.escalation.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: escalation });
});

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: {} });
});

export const getDepartmentManagers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const managers = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, role: { in: ['dept_admin', 'ops_admin', 'finance_admin', 'hr_admin', 'sales_admin'] } } });
  res.json({ success: true, count: managers.length, data: managers });
});

export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assigneeId, ...rest } = req.body;
  const task = await prisma.task.create({ data: { ...rest, assigneeId, orgId: req.user.organizationId, creatorId: req.user.id } });
  res.status(201).json({ success: true, data: task });
});

export const getKPIKRAReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

export const getCenterOnboardingOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centers = await prisma.studyCenter.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, data: centers });
});

export const getStudentEnrollmentOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({ where: { orgId: req.user.organizationId } });
  res.json({ success: true, data: enrollments });
});
