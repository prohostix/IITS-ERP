// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const role = req.user.role;

  const metrics: any = {};

  if (role === 'superadmin') {
    metrics.totalOrganizations = await prisma.organization.count();
    metrics.activeOrganizations = await prisma.organization.count({ where: { status: 'active' as any } });
  }

  if (role !== 'superadmin') {
    metrics.totalEmployees = await prisma.user.count({
      where: { organizationId: organizationId, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin'] } } }
    });
    metrics.totalStudents = await prisma.student.count({ where: { organizationId: organizationId } });
    metrics.totalCenters = await prisma.studyCenter.count({ where: { organizationId: organizationId } });
    metrics.activeCenters = await prisma.studyCenter.count({ where: { organizationId: organizationId, status: 'active' as any } });
    metrics.totalDepartments = await prisma.department.count({ where: { organizationId: organizationId } });
    metrics.totalPrograms = await prisma.program.count({ where: { organizationId: organizationId } });
    metrics.totalOrganizations = await prisma.university.count({ where: { organizationId: organizationId } });
    
    // Pipeline stats
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: organizationId } });
    metrics.pendingApplications = await prisma.enrollment.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.verifiedApplications = await prisma.enrollment.count({ where: { organizationId: organizationId, status: 'enrolled' as any } });
  }

  if (['hr_admin', 'ceo', 'org_admin'].includes(role)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    metrics.presentToday = await prisma.attendance.count({ where: { organizationId: organizationId, date: today, status: 'present' as any } });
    metrics.onLeave = await prisma.attendance.count({ where: { organizationId: organizationId, date: today, status: 'leave' as any } });
    metrics.pendingLeaves = await prisma.leaveRequest.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.totalVacancies = await prisma.vacancy.count({ where: { organizationId: organizationId, status: 'open' as any } });
  }

  if (['finance_admin', 'ceo', 'org_admin'].includes(role)) {
    const invoices = await prisma.invoice.findMany({ where: { organizationId: organizationId, status: 'paid' as any }, select: { total: true } });
    metrics.totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    metrics.pendingInvoices = await prisma.invoice.count({ where: { organizationId: organizationId, status: { in: ['draft', 'sent'] } } });
    metrics.totalPayments = await prisma.paymentEntry.count({ where: { organizationId: organizationId } });
    metrics.pendingExpenses = await prisma.expenseClaim.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.pendingWalletTopUps = await prisma.walletTopUp.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.pendingEnrollments = await prisma.enrollment.count({ where: { organizationId: organizationId, status: 'finance_review' as any } });
    metrics.pendingCenters = await prisma.studyCenter.count({ where: { organizationId: organizationId, status: 'pending_payment' as any } });
  }

  if (['sales_admin', 'ceo'].includes(role)) {
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: organizationId } });
    metrics.convertedLeads = await prisma.lead.count({ where: { organizationId: organizationId, status: 'converted' as any } });
  }

  if (role !== 'superadmin') {
    const taskWhere: any = { organizationId: organizationId };
    if (role === 'employee') taskWhere.assignedTo = req.user.id;

    metrics.pendingTasks = await prisma.task.count({ where: { ...taskWhere, status: 'pending' as any } });
    metrics.completedTasks = await prisma.task.count({ where: { ...taskWhere, status: 'completed' as any } });
  }

  if (role === 'ceo') {
    metrics.activeEscalations = await prisma.escalation.count({ where: { organizationId: organizationId, status: 'active' as any } });
  }

  res.status(200).json({ success: true, data: metrics });
});
