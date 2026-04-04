import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifyUser } from './notificationController.js';

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };

  if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
  if (req.query.departmentId) query.departmentId = req.query.departmentId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.priority) query.priority = req.query.priority;

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name email')
    .populate('departmentId', 'name')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email designation')
    .populate('assignedBy', 'name email')
    .populate('departmentId', 'name');

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  res.status(200).json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.assignedBy = req.user._id;

  const assignerId = req.user._id.toString();
  const assigneeId = req.body.assignedTo?.toString();

  // Superadmin, org_admin, ceo can assign to anyone in the org
  const isTopLevel = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  const isBranchManager = Boolean(req.user.branchId);

  const User = (await import('../models/User.js')).default;

  if (!isTopLevel && !isBranchManager && assigneeId) {
    const assignee = await User.findById(assigneeId).select('reportingTo organizationId departmentId');
    if (!assignee) {
      res.status(404).json({ success: false, message: 'Assigned user not found' });
      return;
    }
    const reportingToId = assignee.reportingTo?.toString();
    if (reportingToId !== assignerId) {
      res.status(403).json({ success: false, message: 'You can only assign tasks to your direct reports' });
      return;
    }
    // Auto-fill departmentId from assignee if not provided
    if (!req.body.departmentId && assignee.departmentId) {
      req.body.departmentId = assignee.departmentId;
    }
  } else if (assigneeId && !req.body.departmentId) {
    // Top-level role or branch manager — still try to auto-fill dept from assignee
    const assignee = await User.findById(assigneeId).select('departmentId');
    if (assignee?.departmentId) req.body.departmentId = assignee.departmentId;
  }

  // departmentId is required by schema — use a fallback if still missing
  if (!req.body.departmentId) {
    // Use assigner's own departmentId as fallback
    if (req.user.departmentId) req.body.departmentId = req.user.departmentId;
  }

  const task = await Task.create(req.body);

  // Notify the assignee
  try {
    await notifyUser(
      req.body.assignedTo.toString(),
      req.user.organizationId.toString(),
      {
        title: 'New Task Assigned',
        message: `"${task.title}" has been assigned to you by ${req.user.name}. Deadline: ${new Date(task.deadline).toLocaleDateString()}.`,
        type: 'task',
        priority: task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium',
        link: 'tasks',
      }
    );
  } catch (_) { /* non-critical */ }

  res.status(201).json({ success: true, data: task });
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  res.status(200).json({ success: true, data: task });
});

export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  task.status = 'completed';
  task.completedAt = new Date();
  task.remarks = req.body.remarks;

  // Collect uploaded file URLs
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const fileUrls = files ? files.map(f => `/uploads/${f.filename}`) : [];

  // Merge with any manually provided evidence URLs
  const manualEvidence: string[] = req.body.evidence
    ? (Array.isArray(req.body.evidence) ? req.body.evidence : [req.body.evidence]).filter(Boolean)
    : [];

  task.evidence = [...fileUrls, ...manualEvidence];
  await task.save();

  // Notify the assigner that the task was completed
  try {
    const assignedById = task.assignedBy?.toString();
    if (assignedById && assignedById !== req.user._id.toString()) {
      await notifyUser(
        assignedById,
        req.user.organizationId.toString(),
        {
          title: 'Task Completed',
          message: `${req.user.name} has completed the task "${task.title}".`,
          type: 'task',
          priority: 'medium',
          link: 'tasks',
        }
      );
    }
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Returns users the current user can assign tasks to (direct reports only, or all for top-level roles)
export const getAssignableUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const User = (await import('../models/User.js')).default;
  const isTopLevel = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  const isBranchManager = Boolean(req.user.branchId);

  let users;

  if (isTopLevel) {
    // org_admin / ceo / superadmin can assign to anyone in the org
    users = await User.find({
      organizationId: req.user.organizationId,
      status: 'active',
      _id: { $ne: req.user._id },
    }).select('name email designation role departmentId reportingTo');

  } else if (isBranchManager) {
    // Branch managers: show all users in their branch departments
    const branchDeptIds: any[] = req.user.additionalDepartmentIds || [];
    users = await User.find({
      organizationId: req.user.organizationId,
      status: 'active',
      _id: { $ne: req.user._id },
      departmentId: { $in: branchDeptIds },
    }).select('name email designation role departmentId reportingTo');

  } else {
    // Regular managers: only direct reports (reportingTo === me)
    users = await User.find({
      organizationId: req.user.organizationId,
      reportingTo: req.user._id,
      status: 'active',
    }).select('name email designation role departmentId reportingTo');
  }

  res.status(200).json({ success: true, count: users.length, data: users });
});
