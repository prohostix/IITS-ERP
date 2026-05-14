import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const role = req.user.role;

  const metrics: any = {};

  if (role === 'superadmin') {
    metrics.totalOrganizations = await prisma.organization.count();
    metrics.activeOrganizations = await prisma.organization.count({ where: { status: 'active' } });
  }

  if (['superadmin', 'ceo', 'org_admin'].includes(role)) {
    metrics.totalEmployees = await prisma.user.count({
      where: { organizationId: orgId, NOT: { role: { in: ['ceo', 'org_admin', 'superadmin'] } } }
    });
    metrics.totalStudents = await prisma.student.count({ where: { orgId: orgId } });
    metrics.totalCenters = await prisma.studyCenter.count({ where: { organizationId: orgId } });
    metrics.activeCenters = await prisma.studyCenter.count({ where: { organizationId: orgId, status: 'active' } });
    metrics.totalDepartments = await prisma.department.count({ where: { organizationId: orgId } });
    metrics.totalPrograms = await prisma.program.count({ where: { organizationId: orgId } });
  }

  if (['hr_admin', 'ceo', 'org_admin'].includes(role)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    metrics.presentToday = await prisma.attendance.count({ where: { orgId: orgId, date: today, status: 'present' } });
    metrics.onLeave = await prisma.attendance.count({ where: { orgId: orgId, date: today, status: 'leave' } });
    metrics.pendingLeaves = await prisma.leaveRequest.count({ where: { orgId: orgId, status: 'pending' } });
    metrics.totalVacancies = await prisma.vacancy.count({ where: { organizationId: orgId, status: 'open' } });
  }

  if (['finance_admin', 'ceo', 'org_admin'].includes(role)) {
    const invoices = await prisma.invoice.findMany({ where: { organizationId: orgId, status: 'paid' }, select: { total: true } });
    metrics.totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    metrics.pendingInvoices = await prisma.invoice.count({ where: { organizationId: orgId, status: { in: ['draft', 'sent'] } } });
    metrics.totalPayments = await prisma.paymentEntry.count({ where: { organizationId: orgId } });
    metrics.pendingExpenses = await prisma.expenseClaim.count({ where: { organizationId: orgId, status: 'pending' } });
  }

  if (['sales_admin', 'ceo'].includes(role)) {
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
    metrics.convertedLeads = await prisma.lead.count({ where: { organizationId: orgId, status: 'converted' } });
  }

  if (role !== 'superadmin') {
    const taskWhere: any = { orgId: orgId };
    if (role === 'employee') taskWhere.assigneeId = req.user.id;

    metrics.pendingTasks = await prisma.task.count({ where: { ...taskWhere, status: 'pending' } });
    metrics.completedTasks = await prisma.task.count({ where: { ...taskWhere, status: 'completed' } });
  }

  if (role === 'ceo') {
    metrics.activeEscalations = await prisma.escalation.count({ where: { organizationId: orgId, status: 'active' } });
  }

  res.status(200).json({ success: true, data: metrics });
});
