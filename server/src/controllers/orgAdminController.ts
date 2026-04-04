import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler, resolveOrgId } from '../utils/asyncHandler.js';
import CeoPanel from '../models/CeoPanel.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import Designation from '../models/Designation.js';

// @desc    Create CEO panel
// @route   POST /api/org/ceo-panels
// @access  Private (Org Admin, Superadmin)
export const createCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignedUserId, name, dataScope } = req.body;

  // Verify user exists and has CEO role
  const user = await User.findById(assignedUserId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'ceo') {
    res.status(400);
    throw new Error('User must have CEO role');
  }

  // Check if user already has a CEO panel
  const existingPanel = await CeoPanel.findOne({ assignedUserId });
  if (existingPanel) {
    res.status(400);
    throw new Error('User already has a CEO panel assigned');
  }

  const ceoPanel = await CeoPanel.create({
    organizationId: req.user.organizationId,
    assignedUserId,
    name,
    dataScope: dataScope || ['all'],
    createdBy: req.user._id,
  });

  // Update user with CEO panel ID
  user.ceoPanelId = ceoPanel._id;
  await user.save();

  res.status(201).json({
    success: true,
    data: ceoPanel,
  });
});

// @desc    Get all CEO panels
// @route   GET /api/org/ceo-panels
// @access  Private (Org Admin, Superadmin)
export const getCeoPanels = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanels = await CeoPanel.find({
    organizationId: req.user.organizationId,
  })
    .populate('assignedUserId', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: ceoPanels.length,
    data: ceoPanels,
  });
});

// @desc    Get single CEO panel
// @route   GET /api/org/ceo-panels/:id
// @access  Private (Org Admin, Superadmin)
export const getCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanel = await CeoPanel.findById(req.params.id)
    .populate('assignedUserId', 'name email role')
    .populate('createdBy', 'name');

  if (!ceoPanel) {
    res.status(404);
    throw new Error('CEO panel not found');
  }

  // Verify organization
  if (ceoPanel.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to access this CEO panel');
  }

  res.status(200).json({
    success: true,
    data: ceoPanel,
  });
});

// @desc    Update CEO panel
// @route   PATCH /api/org/ceo-panels/:id
// @access  Private (Org Admin, Superadmin)
export const updateCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, dataScope, status } = req.body;

  const ceoPanel = await CeoPanel.findById(req.params.id);

  if (!ceoPanel) {
    res.status(404);
    throw new Error('CEO panel not found');
  }

  // Verify organization
  if (ceoPanel.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to update this CEO panel');
  }

  if (name) ceoPanel.name = name;
  if (dataScope) ceoPanel.dataScope = dataScope;
  if (status) ceoPanel.status = status;

  await ceoPanel.save();

  res.status(200).json({
    success: true,
    data: ceoPanel,
  });
});

// @desc    Delete CEO panel
// @route   DELETE /api/org/ceo-panels/:id
// @access  Private (Org Admin, Superadmin)
export const deleteCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanel = await CeoPanel.findById(req.params.id);

  if (!ceoPanel) {
    res.status(404);
    throw new Error('CEO panel not found');
  }

  // Verify organization
  if (ceoPanel.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to delete this CEO panel');
  }

  // Remove CEO panel ID from user
  await User.findByIdAndUpdate(ceoPanel.assignedUserId, { $unset: { ceoPanelId: 1 } });

  await ceoPanel.deleteOne();

  res.status(200).json({
    success: true,
    message: 'CEO panel deleted successfully',
  });
});

// @desc    Create custom department
// @route   POST /api/org/departments/custom
// @access  Private (Org Admin, Superadmin)
export const createCustomDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, features, dashboardWidgets, rolePermissions } = req.body;

  const department = await Department.create({
    organizationId: req.user.organizationId,
    name,
    type: 'custom',
    features: features || [],
    customConfig: {
      dashboardWidgets: dashboardWidgets || [],
      rolePermissions: rolePermissions || {},
    },
  });

  res.status(201).json({
    success: true,
    data: department,
  });
});

// @desc    Get custom departments
// @route   GET /api/org/departments/custom
// @access  Private (Org Admin, Superadmin)
export const getCustomDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const departments = await Department.find({
    organizationId: req.user.organizationId,
    type: 'custom',
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

// @desc    Get full org hierarchy tree
// @route   GET /api/org/hierarchy
// @access  Private (Org Admin, Superadmin)
export const getOrgHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  // Fetch all departments and users in parallel
  const [departments, users] = await Promise.all([
    Department.find({ organizationId: orgId, status: 'active' })
      .populate('managerId', 'name email role designation avatar')
      .populate('assistantManagerIds', 'name email role designation')
      .lean(),
    User.find({ organizationId: orgId, status: 'active' })
      .select('name email role designation departmentId reportingTo avatar userId')
      .populate('reportingTo', 'name role designation')
      .lean(),
  ]);

  // Build department map
  const deptMap: Record<string, any> = {};
  departments.forEach(d => {
    deptMap[d._id.toString()] = {
      ...d,
      subDepartments: [],
      employees: [],
    };
  });

  // Nest sub-departments under parents
  const rootDepts: any[] = [];
  departments.forEach(d => {
    if (d.parentDepartmentId) {
      const parentId = d.parentDepartmentId.toString();
      if (deptMap[parentId]) {
        deptMap[parentId].subDepartments.push(deptMap[d._id.toString()]);
      }
    } else {
      rootDepts.push(deptMap[d._id.toString()]);
    }
  });

  // Assign employees to their departments
  users.forEach(u => {
    if (u.departmentId) {
      const deptId = u.departmentId.toString();
      if (deptMap[deptId]) {
        deptMap[deptId].employees.push(u);
      }
    }
  });

  // Org admin and CEO users (top-level)
  const topLevel = users.filter(u => ['org_admin', 'ceo', 'superadmin'].includes(u.role));

  res.status(200).json({
    success: true,
    data: {
      topLevel,
      departments: rootDepts,
      allUsers: users,
      allDepartments: departments,
    },
  });
});

// @desc    Assign manager to department or set reportingTo for a user
// @route   PATCH /api/org/hierarchy/assign
// @access  Private (Org Admin, Superadmin)
export const assignHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, departmentId, userId, managerId, reportingToId, additionalDepartmentIds } = req.body;
  const orgId = req.user.organizationId;

  if (type === 'manager') {
    if (!departmentId || !managerId) {
      res.status(400); throw new Error('departmentId and managerId are required');
    }
    const dept = await Department.findOne({ _id: departmentId, organizationId: orgId });
    if (!dept) { res.status(404); throw new Error('Department not found'); }
    dept.managerId = managerId;
    await dept.save();
    await User.findByIdAndUpdate(managerId, { departmentId });
    res.status(200).json({ success: true, message: 'Manager assigned', data: dept });

  } else if (type === 'reporting') {
    if (!userId) { res.status(400); throw new Error('userId is required'); }
    const user = await User.findOne({ _id: userId, organizationId: orgId });
    if (!user) { res.status(404); throw new Error('User not found'); }
    user.reportingTo = reportingToId || undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Reporting line updated', data: user });

  } else if (type === 'department') {
    if (!userId || !departmentId) {
      res.status(400); throw new Error('userId and departmentId are required');
    }
    const user = await User.findOne({ _id: userId, organizationId: orgId });
    if (!user) { res.status(404); throw new Error('User not found'); }
    user.departmentId = departmentId;
    await user.save();
    res.status(200).json({ success: true, message: 'User department updated', data: user });

  } else if (type === 'additional_departments') {
    // Set multi-department access (branch managers etc.)
    if (!userId) { res.status(400); throw new Error('userId is required'); }
    const user = await User.findOne({ _id: userId, organizationId: orgId });
    if (!user) { res.status(404); throw new Error('User not found'); }
    user.additionalDepartmentIds = (additionalDepartmentIds || []).map(
      (id: string) => new (require('mongoose').Types.ObjectId)(id)
    );
    await user.save();
    res.status(200).json({ success: true, message: 'Additional departments updated', data: user });

  } else {
    res.status(400);
    throw new Error('Invalid type. Use: manager, reporting, department, or additional_departments');
  }
});

// ─── Designation CRUD ─────────────────────────────────────────────────────────

// @desc    Get all designations (full tree)
// @route   GET /api/org/designations
export const getDesignations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designations = await Designation.find({ organizationId: req.user.organizationId })
    .populate('departmentId', 'name type')
    .populate('subDepartmentId', 'name parentDeptId')
    .populate('branchId', 'name branchCode location')
    .populate('parentDesignationId', 'title')
    .populate('filledBy', 'name email role designation avatar userId')
    .sort({ level: 1, createdAt: 1 });

  res.json({ success: true, count: designations.length, data: designations });
});

// @desc    Create designation
// @route   POST /api/org/designations
export const createDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, departmentId, subDepartmentId, branchId, level, parentDesignationId, maxHeadcount } = req.body;

  if (!title) { res.status(400); throw new Error('Title is required'); }

  const designation = await Designation.create({
    organizationId: req.user.organizationId,
    title,
    departmentId: departmentId || null,
    subDepartmentId: subDepartmentId || null,
    branchId: branchId || null,
    level: level || 1,
    parentDesignationId: parentDesignationId || null,
    maxHeadcount: maxHeadcount || 1,
  });

  await designation.populate('departmentId', 'name type');
  await designation.populate('subDepartmentId', 'name parentDeptId');
  await designation.populate('branchId', 'name branchCode location');
  res.status(201).json({ success: true, data: designation });
});

// @desc    Update designation
// @route   PATCH /api/org/designations/:id
export const updateDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designation = await Designation.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true, runValidators: true }
  ).populate('departmentId', 'name type')
   .populate('subDepartmentId', 'name parentDeptId')
   .populate('branchId', 'name branchCode location')
   .populate('filledBy', 'name email role');

  if (!designation) { res.status(404); throw new Error('Designation not found'); }
  res.json({ success: true, data: designation });
});

// @desc    Delete designation
// @route   DELETE /api/org/designations/:id
export const deleteDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designation = await Designation.findOneAndDelete({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });
  if (!designation) { res.status(404); throw new Error('Designation not found'); }
  res.json({ success: true, data: {} });
});

// @desc    Assign user to a designation (HR uses this)
// @route   PATCH /api/org/designations/:id/assign
export const assignUserToDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const designation = await Designation.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });
  if (!designation) { res.status(404); throw new Error('Designation not found'); }

  const filledBy: mongoose.Types.ObjectId[] = (designation.filledBy || []) as mongoose.Types.ObjectId[];
  if (filledBy.length >= designation.maxHeadcount) {
    res.status(400);
    throw new Error(`This position is already at full capacity (${designation.maxHeadcount})`);
  }

  const alreadyAssigned = filledBy.some((id) => id.toString() === userId);
  if (!alreadyAssigned) {
    await Designation.findByIdAndUpdate(designation._id, {
      $addToSet: { filledBy: userId },
    });
  }

  // Update user's designation title
  const userUpdate: any = { designation: designation.title };

  // Auto-set reportingTo based on parent designation's filledBy
  if (designation.parentDesignationId) {
    const parentDesignation = await Designation.findById(designation.parentDesignationId)
      .populate('filledBy', '_id');
    const parentFilledBy = (parentDesignation?.filledBy || []) as any[];
    if (parentFilledBy.length > 0) {
      // Report to the first person filling the parent position
      userUpdate.reportingTo = parentFilledBy[0]._id || parentFilledBy[0];
    }
  }

  await User.findByIdAndUpdate(userId, userUpdate);

  // Also update reportingTo for anyone in child designations whose parent is this one
  // (so existing child users now report to the newly assigned person)
  const childDesignations = await Designation.find({
    parentDesignationId: designation._id,
    organizationId: req.user.organizationId,
  }).populate('filledBy', '_id');

  for (const child of childDesignations) {
    const childUsers = (child.filledBy || []) as any[];
    for (const childUser of childUsers) {
      const childUserId = childUser._id || childUser;
      if (childUserId.toString() !== userId) {
        await User.findByIdAndUpdate(childUserId, { reportingTo: userId });
      }
    }
  }

  const updated = await Designation.findById(designation._id)
    .populate('filledBy', 'name email role designation');
  res.json({ success: true, data: updated });
});

// @desc    Remove user from a designation
// @route   PATCH /api/org/designations/:id/unassign
export const unassignUserFromDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const designation = await Designation.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    { $pull: { filledBy: userId } },
    { new: true }
  ).populate('filledBy', 'name email role designation');

  if (!designation) { res.status(404); throw new Error('Designation not found'); }

  // Clear reportingTo for this user
  await User.findByIdAndUpdate(userId, { $unset: { reportingTo: 1 } });

  // If there are still people in this designation, re-point child users to remaining filledBy[0]
  const remainingFilledBy = (designation.filledBy || []) as any[];
  if (remainingFilledBy.length === 0) {
    // No one left in this position — clear reportingTo for all child designation users
    const childDesignations = await Designation.find({
      parentDesignationId: designation._id,
      organizationId: req.user.organizationId,
    }).populate('filledBy', '_id');

    for (const child of childDesignations) {
      const childUsers = (child.filledBy || []) as any[];
      for (const childUser of childUsers) {
        await User.findByIdAndUpdate(childUser._id || childUser, { $unset: { reportingTo: 1 } });
      }
    }
  }

  res.json({ success: true, data: designation });
});
