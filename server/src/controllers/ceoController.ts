// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { organizationId: req.user.organizationId } }),
    prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'completed' as any } })
  ]);
  res.json({ success: true, data: { taskCompletionRate: total > 0 ? (completed / total) * 100 : 0 } });
});

export const getRiskMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const overdue = await prisma.task.count({ where: { organizationId: req.user.organizationId, status: 'overdue' as any } });
  res.json({ success: true, data: { overdueTasks: overdue } });
});

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalations = await prisma.escalation.findMany({ where: { organizationId: req.user.organizationId }, include: { employee: true } });
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
  const { assignedTo, ...rest } = req.body;
  const task = await prisma.task.create({ data: { ...rest, assignedTo, organizationId: req.user.organizationId, createdBy: req.user.id } });
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
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      program: true,
      studyCenter: true,
      session: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const statusCounts: Record<string, number> = {};
  enrollments.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  const monthlyMap: Record<string, { month: string; total: number; enrolled: number; pending: number; rejected: number }> = {};
  
  enrollments.forEach(e => {
    const date = new Date(e.createdAt);
    const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    if (!monthlyMap[monthStr]) {
      monthlyMap[monthStr] = { month: monthStr, total: 0, enrolled: 0, pending: 0, rejected: 0 };
    }
    
    monthlyMap[monthStr].total += 1;
    if (e.status === 'enrolled') {
      monthlyMap[monthStr].enrolled += 1;
    } else if (e.status === 'rejected' || e.status === 'department_rejected') {
      monthlyMap[monthStr].rejected += 1;
    } else {
      monthlyMap[monthStr].pending += 1;
    }
  });

  const sortedMonths = Object.keys(monthlyMap).sort((a, b) => {
    const dateA = new Date('01 ' + a);
    const dateB = new Date('01 ' + b);
    return dateA.getTime() - dateB.getTime();
  });
  
  const monthly = sortedMonths.map(m => monthlyMap[m]);

  res.json({
    success: true,
    data: {
      statusCounts,
      total: enrollments.length,
      enrollments,
      monthly
    }
  });
});
