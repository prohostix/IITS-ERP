import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler, resolveOrgId } from '../utils/asyncHandler.js';
import EscalationLog from '../models/EscalationLog.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Student from '../models/Student.js';
import Invoice from '../models/Invoice.js';
import Lead from '../models/Lead.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { emitToUser } from '../config/socket.js';

// @desc    Get performance metrics for CEO dashboard
// @route   GET /api/ceo/metrics/performance
// @access  Private (CEO only)
export const getPerformanceMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  // Task completion metrics
  const totalTasks = await Task.countDocuments({ organizationId: orgId });
  const completedTasks = await Task.countDocuments({
    organizationId: orgId,
    status: 'completed',
  });
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Average task completion time
  const completedTasksWithTime = await Task.find({
    organizationId: orgId,
    status: 'completed',
    completedAt: { $exists: true },
  }).select('createdAt completedAt');

  let avgCompletionTime = 0;
  if (completedTasksWithTime.length > 0) {
    const totalTime = completedTasksWithTime.reduce((sum, task) => {
      const time = task.completedAt!.getTime() - task.createdAt.getTime();
      return sum + time;
    }, 0);
    avgCompletionTime = totalTime / completedTasksWithTime.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  // Employee productivity (tasks completed per employee)
  const employeeTaskCounts = await Task.aggregate([
    { $match: { organizationId: orgId, status: 'completed' } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const avgProductivity =
    employeeTaskCounts.length > 0
      ? employeeTaskCounts.reduce((sum, emp) => sum + emp.count, 0) / employeeTaskCounts.length
      : 0;

  // Admission to enrollment cycle time
  const students = await Student.find({
    organizationId: orgId,
    status: 'active',
  }).select('createdAt');
  const avgAdmissionCycle = students.length > 0 ? 7 : 0; // Placeholder

  // Revenue per study center
  const revenueByCenter = await Invoice.aggregate([
    { $match: { organizationId: orgId, status: 'paid' } },
    { $group: { _id: '$centerId', revenue: { $sum: '$total' } } },
  ]);
  const avgRevenuePerCenter =
    revenueByCenter.length > 0
      ? revenueByCenter.reduce((sum, c) => sum + c.revenue, 0) / revenueByCenter.length
      : 0;

  // Leave approval turnaround
  const approvedLeaves = await LeaveRequest.find({
    organizationId: orgId,
    status: 'approved',
  }).select('appliedAt updatedAt');
  let avgLeaveTurnaround = 0;
  if (approvedLeaves.length > 0) {
    const totalTime = approvedLeaves.reduce((sum, leave) => {
      const time = leave.updatedAt.getTime() - leave.appliedAt.getTime();
      return sum + time;
    }, 0);
    avgLeaveTurnaround = totalTime / approvedLeaves.length / (1000 * 60 * 60); // Convert to hours
  }

  res.status(200).json({
    success: true,
    data: {
      taskCompletionRate: Math.round(taskCompletionRate * 10) / 10,
      avgTaskCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      employeeProductivityScore: Math.round(avgProductivity * 10) / 10,
      admissionToEnrollmentCycle: Math.round(avgAdmissionCycle * 10) / 10,
      revenuePerStudyCenter: Math.round(avgRevenuePerCenter),
      leaveApprovalTurnaround: Math.round(avgLeaveTurnaround * 10) / 10,
    },
  });
});

// @desc    Get risk metrics for CEO dashboard
// @route   GET /api/ceo/metrics/risk
// @access  Private (CEO only)
export const getRiskMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  // Overdue tasks
  const overdueTasks = await Task.countDocuments({
    organizationId: orgId,
    status: 'overdue',
  });

  // Delayed approval chains
  const pendingApprovals = await LeaveRequest.countDocuments({
    organizationId: orgId,
    status: 'pending',
    appliedAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Older than 48 hours
  });

  // High-value invoices pending
  const highValueThreshold = 50000;
  const pendingHighValueInvoices = await Invoice.countDocuments({
    organizationId: orgId,
    status: { $in: ['draft', 'sent'] },
    total: { $gte: highValueThreshold },
    createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Older than 7 days
  });

  // Compliance exceptions (placeholder)
  const complianceExceptions = 0;

  // Repeated credential requests
  const repeatedCredentialRequests = 0; // Will be implemented with CredentialRequest

  res.status(200).json({
    success: true,
    data: {
      overdueTasks,
      delayedApprovalChains: pendingApprovals,
      complianceExceptions,
      highValueInvoicesPending: pendingHighValueInvoices,
      repeatedCredentialRequests,
    },
  });
});

// @desc    Get all escalations for CEO
// @route   GET /api/ceo/escalations
// @access  Private (CEO only)
export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { status, priority } = req.query;

  const query: any = { organizationId: orgId };

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  const escalations = await EscalationLog.find(query)
    .populate('taskId', 'title description deadline priority')
    .populate('employeeId', 'name email')
    .populate('deptAdminId', 'name email')
    .sort({ escalatedAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    count: escalations.length,
    data: escalations,
  });
});

// @desc    Handle escalation (resolve, reassign, extend, justify)
// @route   PATCH /api/ceo/escalations/:id
// @access  Private (CEO only)
export const handleEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action, resolution, newDeadline, reassignTo } = req.body;

  const escalation = await EscalationLog.findById(id);

  if (!escalation) {
    res.status(404);
    throw new Error('Escalation not found');
  }

  // Verify organization
  if (escalation.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to handle this escalation');
  }

  const task = await Task.findById(escalation.taskId);

  if (!task) {
    res.status(404);
    throw new Error('Associated task not found');
  }

  switch (action) {
    case 'resolve':
      escalation.status = 'resolved';
      escalation.resolution = resolution;
      escalation.resolvedAt = new Date();
      escalation.resolvedBy = req.user._id;
      task.status = 'completed';
      task.completedAt = new Date();
      break;

    case 'reassign':
      if (!reassignTo) {
        res.status(400);
        throw new Error('reassignTo is required for reassign action');
      }
      escalation.status = 'reassigned';
      escalation.resolution = `Reassigned to ${reassignTo}`;
      escalation.resolvedAt = new Date();
      escalation.resolvedBy = req.user._id;
      task.assignedTo = reassignTo;
      task.escalationStatus = 'none';
      break;

    case 'extend':
      if (!newDeadline) {
        res.status(400);
        throw new Error('newDeadline is required for extend action');
      }
      escalation.status = 'extended';
      escalation.resolution = `Deadline extended to ${newDeadline}`;
      escalation.resolvedAt = new Date();
      escalation.resolvedBy = req.user._id;
      task.deadline = new Date(newDeadline);
      task.status = 'in_progress';
      task.escalationStatus = 'none';
      break;

    case 'justify':
      escalation.status = 'justified';
      escalation.resolution = resolution || 'Justified by CEO';
      escalation.resolvedAt = new Date();
      escalation.resolvedBy = req.user._id;
      task.escalationStatus = 'none';
      break;

    default:
      res.status(400);
      throw new Error('Invalid action. Must be: resolve, reassign, extend, or justify');
  }

  // Add to chain
  escalation.chain.push({
    level: 'ceo',
    userId: req.user._id,
    action: `CEO ${action}: ${resolution || ''}`,
    timestamp: new Date(),
  });

  await escalation.save();
  await task.save();

  // Notify employee
  emitToUser(task.assignedTo.toString(), 'escalation-resolved', {
    escalationId: escalation._id,
    taskId: task._id,
    action,
    resolution,
  });

  res.status(200).json({
    success: true,
    data: escalation,
  });
});

// @desc    Get department managers for CEO task assignment
// @route   GET /api/ceo/managers
// @access  Private (CEO only)
export const getDepartmentManagers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  const managers = await User.find({
    organizationId: orgId,
    role: { $in: ['ops_admin', 'finance_admin', 'hr_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'] },
    status: 'active',
  })
    .select('name email role designation departmentId')
    .populate('departmentId', 'name type');

  res.status(200).json({ success: true, data: managers });
});

// @desc    CEO assigns a task to a department manager
// @route   POST /api/ceo/tasks
// @access  Private (CEO only)
export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, assignedTo, departmentId, priority, deadline } = req.body;

  if (!title || !assignedTo || !departmentId || !deadline) {
    res.status(400);
    throw new Error('title, assignedTo, departmentId, and deadline are required');
  }

  const task = await Task.create({
    organizationId: req.user.organizationId,
    assignedBy: req.user._id,
    title,
    description: description || '',
    assignedTo,
    departmentId,
    priority: priority || 'medium',
    deadline: new Date(deadline),
    status: 'pending',
  });

  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name email')
    .populate('departmentId', 'name');

  // Notify the assigned manager
  emitToUser(assignedTo, 'task-assigned', {
    taskId: task._id,
    title,
    assignedBy: req.user.name,
    deadline,
  });

  res.status(201).json({ success: true, data: populated });
});

// @desc    Get KPI/KRA reports for all employees (CEO view)
// @route   GET /api/ceo/kpi-kra-report
// @access  Private (CEO only)
export const getKPIKRAReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  const EmployeeProfile = (await import('../models/EmployeeProfile.js')).default;

  const profiles = await EmployeeProfile.find({
    organizationId: orgId,
    $or: [
      { 'kpis.0': { $exists: true } },
      { 'kras.0': { $exists: true } },
    ],
  })
    .populate('userId', 'name email designation role departmentId status')
    .populate({ path: 'userId', populate: { path: 'departmentId', select: 'name type' } })
    .sort('userId');

  const report = profiles.map((p: any) => {
    const user = p.userId || {};
    const kpis = p.kpis || [];
    const kras = p.kras || [];

    // KPI summary
    const kpiAchievedCount = kpis.filter((k: any) => k.status === 'achieved').length;
    const kpiAtRiskCount = kpis.filter((k: any) => k.status === 'at_risk').length;
    const kpiMissedCount = kpis.filter((k: any) => k.status === 'missed').length;
    const avgKpiPct = kpis.length
      ? Math.round(kpis.reduce((s: number, k: any) => s + Math.min(100, (k.achieved / k.target) * 100), 0) / kpis.length)
      : 0;

    // KRA summary
    const ratedKras = kras.filter((k: any) => k.rating);
    const avgKraRating = ratedKras.length
      ? (ratedKras.reduce((s: number, k: any) => s + k.rating, 0) / ratedKras.length).toFixed(1)
      : null;
    const totalWeightage = kras.reduce((s: number, k: any) => s + (k.weightage || 0), 0);

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      designation: user.designation,
      role: user.role,
      department: user.departmentId?.name || '—',
      status: user.status,
      overallRating: p.overallRating,
      lastReviewDate: p.lastReviewDate,
      nextReviewDate: p.nextReviewDate,
      reviewRemarks: p.reviewRemarks,
      kpis,
      kpiSummary: { total: kpis.length, achieved: kpiAchievedCount, atRisk: kpiAtRiskCount, missed: kpiMissedCount, avgPct: avgKpiPct },
      kras,
      kraSummary: { total: kras.length, avgRating: avgKraRating, totalWeightage },
    };
  });

  res.json({ success: true, count: report.length, data: report });
});
// @access  Private (CEO only)
export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mongoose = (await import('mongoose')).default;
  const orgId = new mongoose.Types.ObjectId(resolveOrgId(req.user.organizationId));

  // --- Employee Performance (task-based) ---
  const employeeTaskStats = await Task.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$assignedTo',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
      },
    },
    { $sort: { completed: -1 } },
    { $limit: 20 },
  ]);

  // Fallback: if no tasks, still return all active users with zero stats
  let employeePerformance: any[] = [];
  if (employeeTaskStats.length > 0) {
    const userIds = employeeTaskStats.map((s) => s._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email role departmentId');
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    employeePerformance = employeeTaskStats.map((s) => {
      const user = userMap[s._id?.toString()];
      const completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      return {
        userId: s._id,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        role: user?.role || '',
        total: s.total,
        completed: s.completed,
        overdue: s.overdue,
        inProgress: s.inProgress,
        completionRate,
        score: Math.max(0, completionRate - s.overdue * 5),
      };
    });
  } else {
    // No tasks yet — return all active employees with zero stats
    const allUsers = await User.find({ organizationId: orgId, status: 'active' })
      .select('name email role departmentId')
      .limit(20);
    employeePerformance = allUsers.map((u) => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      total: 0,
      completed: 0,
      overdue: 0,
      inProgress: 0,
      completionRate: 0,
      score: 0,
    }));
  }

  // --- Department Efficiency ---
  const deptTaskStats = await Task.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$departmentId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
      },
    },
  ]);

  // Member counts per department
  const memberCounts = await User.aggregate([
    { $match: { organizationId: orgId } },
    { $group: { _id: '$departmentId', count: { $sum: 1 } } },
  ]);
  const memberMap = Object.fromEntries(memberCounts.map((m) => [m._id?.toString(), m.count]));

  let departmentEfficiency: any[] = [];
  if (deptTaskStats.length > 0) {
    const deptIds = deptTaskStats.map((s) => s._id);
    const departments = await Department.find({ _id: { $in: deptIds } }).select('name type');
    const deptMap = Object.fromEntries(departments.map((d) => [d._id.toString(), d]));
    departmentEfficiency = deptTaskStats.map((s) => {
      const dept = deptMap[s._id?.toString()];
      const completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      const overdueRate = s.total > 0 ? Math.round((s.overdue / s.total) * 100) : 0;
      const efficiency = Math.max(0, completionRate - overdueRate);
      return {
        departmentId: s._id,
        name: dept?.name || 'Unknown',
        type: dept?.type || '',
        memberCount: memberMap[s._id?.toString()] || 0,
        total: s.total,
        completed: s.completed,
        overdue: s.overdue,
        inProgress: s.inProgress,
        completionRate,
        overdueRate,
        efficiency,
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  } else {
    // No tasks yet — return all departments with zero efficiency
    const allDepts = await Department.find({ organizationId: orgId }).select('name type');
    departmentEfficiency = allDepts.map((d) => ({
      departmentId: d._id,
      name: d.name,
      type: d.type,
      memberCount: memberMap[d._id.toString()] || 0,
      total: 0,
      completed: 0,
      overdue: 0,
      inProgress: 0,
      completionRate: 0,
      overdueRate: 0,
      efficiency: 0,
    }));
  }

  res.status(200).json({
    success: true,
    data: { employeePerformance, departmentEfficiency },
  });
});

// @desc    Get org-wide center onboarding status overview
// @route   GET /api/ceo/center-onboarding
// @access  Private (CEO only)
export const getCenterOnboardingOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mongoose = (await import('mongoose')).default;
  const StudyCenter = (await import('../models/StudyCenter.js')).default;
  const Enrollment = (await import('../models/Enrollment.js')).default;

  const orgId = new mongoose.Types.ObjectId(resolveOrgId(req.user.organizationId));

  // Get all centers for this org
  const centers = await StudyCenter.find({ organizationId: orgId })
    .populate('referredBy', 'name email')
    .populate('associatedUniversityIds', 'name code')
    .populate('verifiedBy', 'name email')
    .populate('financeApprovedBy', 'name email')
    .sort('-createdAt')
    .lean();

  // Get enrollment counts per center
  const enrollmentCounts = await Enrollment.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$studyCenterId',
        total: { $sum: 1 },
        enrolled: { $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] } },
        pending: {
          $sum: {
            $cond: [
              { $in: ['$status', ['payment_pending', 'document_review', 'finance_review']] },
              1,
              0,
            ],
          },
        },
        rejected: {
          $sum: {
            $cond: [{ $in: ['$status', ['rejected', 'department_rejected']] }, 1, 0],
          },
        },
      },
    },
  ]);

  const enrollMap: Record<string, any> = {};
  enrollmentCounts.forEach((e: any) => {
    enrollMap[e._id?.toString()] = e;
  });

  // Compute SLA and enrich
  const SLA_HOURS = 48;
  const enriched = centers.map((c: any) => {
    const hrs = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 3600000);
    const slaBreached = c.status === 'pending_verification' && hrs > SLA_HOURS;
    const enroll = enrollMap[c._id?.toString()] || { total: 0, enrolled: 0, pending: 0, rejected: 0 };
    return {
      ...c,
      hoursAtCurrentStage: hrs,
      slaBreached,
      studentStats: enroll,
    };
  });

  // Summary counts
  const summary = {
    total: centers.length,
    pending_verification: centers.filter((c: any) => c.status === 'pending_verification').length,
    ops_verified: centers.filter((c: any) => c.status === 'ops_verified').length,
    pending_payment: centers.filter((c: any) => c.status === 'pending_payment').length,
    active: centers.filter((c: any) => c.status === 'active').length,
    rejected: centers.filter((c: any) => c.status === 'rejected').length,
    slaBreached: enriched.filter((c: any) => c.slaBreached).length,
  };

  res.status(200).json({ success: true, data: { summary, centers: enriched } });
});

// @desc    Get org-wide student enrollment pipeline
// @route   GET /api/ceo/enrollment-overview
// @access  Private (CEO only)
export const getStudentEnrollmentOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mongoose = (await import('mongoose')).default;
  const Enrollment = (await import('../models/Enrollment.js')).default;

  const orgId = new mongoose.Types.ObjectId(resolveOrgId(req.user.organizationId));

  const enrollments = await Enrollment.find({ organizationId: orgId })
    .populate('programId', 'name code')
    .populate('studyCenterId', 'name code')
    .sort('-createdAt')
    .lean();

  // Summary by status
  const statusCounts: Record<string, number> = {};
  enrollments.forEach((e: any) => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  // Monthly trend (last 6 months)
  const monthlyTrend: Record<string, { month: string; total: number; enrolled: number; pending: number; rejected: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyTrend[key] = { month: label, total: 0, enrolled: 0, pending: 0, rejected: 0 };
  }
  for (const e of enrollments) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTrend[key]) continue;
    monthlyTrend[key].total++;
    if (e.status === 'enrolled') monthlyTrend[key].enrolled++;
    else if (['payment_pending', 'document_review', 'finance_review'].includes(e.status)) monthlyTrend[key].pending++;
    else if (['rejected', 'department_rejected'].includes(e.status)) monthlyTrend[key].rejected++;
  }

  res.status(200).json({
    success: true,
    data: {
      statusCounts,
      total: enrollments.length,
      enrollments: enrollments.slice(0, 100), // Latest 100
      monthly: Object.values(monthlyTrend),
    },
  });
});
