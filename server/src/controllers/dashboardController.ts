import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import StudyCenter from '../models/StudyCenter.js';
import Task from '../models/Task.js';
import Invoice from '../models/Invoice.js';
import Lead from '../models/Lead.js';
import Escalation from '../models/Escalation.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Department from '../models/Department.js';
import Program from '../models/Program.js';
import PaymentEntry from '../models/PaymentEntry.js';
import ExpenseClaim from '../models/ExpenseClaim.js';
import Vacancy from '../models/Vacancy.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const role = req.user.role;

  const metrics: any = {};

  if (role === 'superadmin') {
    metrics.totalOrganizations = await Organization.countDocuments();
    metrics.activeOrganizations = await Organization.countDocuments({ status: 'active' });
  }

  if (role === 'superadmin' || role === 'ceo' || role === 'org_admin') {
    metrics.totalEmployees = await User.countDocuments({
      organizationId: orgId,
      role: { $nin: ['ceo', 'org_admin', 'superadmin'] },
    });
    metrics.totalStudents = await Student.countDocuments({ organizationId: orgId });
    metrics.totalCenters = await StudyCenter.countDocuments({ organizationId: orgId });
    metrics.activeCenters = await StudyCenter.countDocuments({ 
      organizationId: orgId, 
      status: 'active' 
    });
    metrics.totalDepartments = await Department.countDocuments({ organizationId: orgId });
    metrics.totalPrograms = await Program.countDocuments({ organizationId: orgId });
  }

  if (role === 'hr_admin' || role === 'ceo' || role === 'org_admin') {
    metrics.totalEmployees = await User.countDocuments({
      organizationId: orgId,
      role: { $nin: ['ceo', 'org_admin', 'superadmin'] },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    metrics.presentToday = await Attendance.countDocuments({
      organizationId: orgId,
      date: today,
      status: 'present',
    });

    metrics.onLeave = await Attendance.countDocuments({
      organizationId: orgId,
      date: today,
      status: 'leave',
    });

    metrics.pendingLeaves = await LeaveRequest.countDocuments({
      organizationId: orgId,
      status: 'pending',
    });
    
    metrics.totalVacancies = await Vacancy.countDocuments({
      organizationId: orgId,
      status: 'open',
    });
  }

  if (role === 'ops_admin' || role === 'ceo') {
    metrics.pendingAdmissions = await Student.countDocuments({
      organizationId: orgId,
      status: 'pending',
    });

    metrics.activeStudents = await Student.countDocuments({
      organizationId: orgId,
      status: 'active',
    });

    metrics.pendingCenters = await StudyCenter.countDocuments({
      organizationId: orgId,
      status: 'pending',
    });
  }

  if (role === 'finance_admin' || role === 'ceo' || role === 'org_admin') {
    const invoices = await Invoice.find({ organizationId: orgId });
    metrics.totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    metrics.pendingInvoices = await Invoice.countDocuments({
      organizationId: orgId,
      status: { $in: ['draft', 'sent'] },
    });

    metrics.overdueInvoices = await Invoice.countDocuments({
      organizationId: orgId,
      status: 'overdue',
    });
    
    metrics.totalPayments = await PaymentEntry.countDocuments({ organizationId: orgId });
    metrics.totalExpenses = await ExpenseClaim.countDocuments({ organizationId: orgId });
    metrics.pendingExpenses = await ExpenseClaim.countDocuments({
      organizationId: orgId,
      status: 'pending',
    });
  }

  if (role === 'sales_admin' || role === 'ceo') {
    metrics.totalLeads = await Lead.countDocuments({ organizationId: orgId });
    metrics.convertedLeads = await Lead.countDocuments({
      organizationId: orgId,
      status: 'converted',
    });
    metrics.pendingLeads = await Lead.countDocuments({
      organizationId: orgId,
      status: { $in: ['new', 'contacted', 'qualified'] },
    });
  }

  // Tasks for all roles
  if (role !== 'superadmin') {
    const taskQuery: any = { organizationId: orgId };
    
    if (role === 'employee') {
      taskQuery.assignedTo = req.user._id;
    }

    metrics.pendingTasks = await Task.countDocuments({
      ...taskQuery,
      status: 'pending',
    });

    metrics.overdueTasks = await Task.countDocuments({
      ...taskQuery,
      status: 'overdue',
    });

    metrics.completedTasks = await Task.countDocuments({
      ...taskQuery,
      status: 'completed',
    });
  }

  // Escalations for CEO
  if (role === 'ceo') {
    metrics.activeEscalations = await Escalation.countDocuments({
      organizationId: orgId,
      status: 'active',
    });

    metrics.criticalEscalations = await Escalation.countDocuments({
      organizationId: orgId,
      status: 'active',
      impact: 'critical',
    });
  }

  res.status(200).json({
    success: true,
    data: metrics,
  });
});
