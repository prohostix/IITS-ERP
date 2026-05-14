import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Branch from '../models/Branch.js';
import Department from '../models/Department.js';
import User from '../models/User.js';

// Helper: build the full set of dept IDs for a branch (sales + ops + additional)
function allBranchDeptIds(branch: any): mongoose.Types.ObjectId[] {
  const ids: mongoose.Types.ObjectId[] = [];
  if (branch.salesDeptId) ids.push(branch.salesDeptId);
  if (branch.operationsDeptId) ids.push(branch.operationsDeptId);
  (branch.additionalDeptIds || []).forEach((id: mongoose.Types.ObjectId) => ids.push(id));
  return ids;
}

const POPULATE_BRANCH = [
  { path: 'branchManagerId', select: 'name email role userId designation' },
  { path: 'salesDeptId', select: 'name type' },
  { path: 'operationsDeptId', select: 'name type' },
  { path: 'additionalDeptIds', select: 'name type' },
];

// @desc    Get all branches
// @route   GET /api/org/branches
export const getBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branches = await Branch.find({ organizationId: req.user.organizationId })
    .populate(POPULATE_BRANCH)
    .sort({ createdAt: -1 });

  res.json({ success: true, count: branches.length, data: branches });
});

// @desc    Get single branch
// @route   GET /api/org/branches/:id
export const getBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await Branch.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
    .populate(POPULATE_BRANCH);

  if (!branch) { res.status(404); throw new Error('Branch not found'); }
  res.json({ success: true, data: branch });
});

// @desc    Create branch — auto-creates Sales and Operations departments
// @route   POST /api/org/branches
export const createBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, branchCode, location, city, state, branchManagerId, additionalDeptIds } = req.body;

  if (!name || !branchCode || !location) {
    res.status(400); throw new Error('name, branchCode, and location are required');
  }

  const orgId = req.user.organizationId;

  const existing = await Branch.findOne({ organizationId: orgId, branchCode: branchCode.toUpperCase() });
  if (existing) { res.status(400); throw new Error(`Branch code "${branchCode}" already exists`); }

  const salesDept = await Department.create({
    organizationId: orgId,
    name: `${name} — Sales`,
    type: 'sales',
    features: ['leads', 'targets', 'study_centers'],
    managerId: branchManagerId || null,
  });

  const opsDept = await Department.create({
    organizationId: orgId,
    name: `${name} — Operations`,
    type: 'operations',
    features: ['students', 'universities', 'programs', 'study_centers', 'admission_sessions'],
    managerId: branchManagerId || null,
  });

  const extraDeptIds: mongoose.Types.ObjectId[] = (additionalDeptIds || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const branch = await Branch.create({
    organizationId: orgId,
    name,
    branchCode: branchCode.toUpperCase(),
    location,
    city,
    state,
    branchManagerId: branchManagerId || null,
    salesDeptId: salesDept._id,
    operationsDeptId: opsDept._id,
    additionalDeptIds: extraDeptIds,
  });

  if (branchManagerId) {
    const allDepts = [salesDept._id, opsDept._id, ...extraDeptIds];
    await User.findByIdAndUpdate(branchManagerId, {
      $addToSet: { additionalDepartmentIds: { $each: allDepts } },
    });
  }

  await branch.populate(POPULATE_BRANCH);
  res.status(201).json({ success: true, data: branch });
});

// @desc    Update branch name/location/status
// @route   PATCH /api/org/branches/:id
export const updateBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, location, city, state, status } = req.body;

  const branch = await Branch.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!branch) { res.status(404); throw new Error('Branch not found'); }

  if (name) {
    branch.name = name;
    if (branch.salesDeptId) await Department.findByIdAndUpdate(branch.salesDeptId, { name: `${name} — Sales` });
    if (branch.operationsDeptId) await Department.findByIdAndUpdate(branch.operationsDeptId, { name: `${name} — Operations` });
  }
  if (location !== undefined) branch.location = location;
  if (city !== undefined) branch.city = city;
  if (state !== undefined) branch.state = state;
  if (status) branch.status = status;

  await branch.save();
  await branch.populate(POPULATE_BRANCH);
  res.json({ success: true, data: branch });
});

// @desc    Assign / change branch manager (with optional extra departments)
// @route   PATCH /api/org/branches/:id/manager
export const assignBranchManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, additionalDeptIds } = req.body;
  const orgId = req.user.organizationId;

  const branch = await Branch.findOne({ _id: req.params.id, organizationId: orgId });
  if (!branch) { res.status(404); throw new Error('Branch not found'); }

  // Strip old manager's access to ALL branch depts
  if (branch.branchManagerId) {
    const oldDepts = allBranchDeptIds(branch);
    if (oldDepts.length) {
      await User.findByIdAndUpdate(branch.branchManagerId, {
        $pullAll: { additionalDepartmentIds: oldDepts },
        branchId: null,
      });
    } else {
      await User.findByIdAndUpdate(branch.branchManagerId, { branchId: null });
    }
  }

  // Update additionalDeptIds on the branch if provided
  if (additionalDeptIds !== undefined) {
    branch.additionalDeptIds = (additionalDeptIds as string[]).map(
      id => new mongoose.Types.ObjectId(id)
    );
  }

  if (userId) {
    const user = await User.findOne({ _id: userId, organizationId: orgId });
    if (!user) { res.status(404); throw new Error('User not found'); }

    branch.branchManagerId = new mongoose.Types.ObjectId(userId);

    // Give new manager access to all branch depts (sales + ops + additional)
    const allDepts = allBranchDeptIds(branch);
    if (allDepts.length) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { additionalDepartmentIds: { $each: allDepts } },
        branchId: branch._id,
      });
    } else {
      await User.findByIdAndUpdate(userId, { branchId: branch._id });
    }

    // Set as manager on sales + ops depts
    if (branch.salesDeptId) await Department.findByIdAndUpdate(branch.salesDeptId, { managerId: userId });
    if (branch.operationsDeptId) await Department.findByIdAndUpdate(branch.operationsDeptId, { managerId: userId });
  } else {
    branch.branchManagerId = undefined;
  }

  await branch.save();
  await branch.populate(POPULATE_BRANCH);
  res.json({ success: true, data: branch });
});

// @desc    Update the additional departments a branch manager can access
// @route   PATCH /api/org/branches/:id/departments
export const updateBranchDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { additionalDeptIds } = req.body; // full replacement array
  const orgId = req.user.organizationId;

  const branch = await Branch.findOne({ _id: req.params.id, organizationId: orgId });
  if (!branch) { res.status(404); throw new Error('Branch not found'); }

  const newExtraDepts: mongoose.Types.ObjectId[] = (additionalDeptIds || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  // If there's a manager, update their additionalDepartmentIds:
  // remove old extra depts, add new ones (keep sales + ops always)
  if (branch.branchManagerId) {
    const oldExtra = branch.additionalDeptIds || [];
    if (oldExtra.length) {
      await User.findByIdAndUpdate(branch.branchManagerId, {
        $pullAll: { additionalDepartmentIds: oldExtra },
      });
    }
    if (newExtraDepts.length) {
      await User.findByIdAndUpdate(branch.branchManagerId, {
        $addToSet: { additionalDepartmentIds: { $each: newExtraDepts } },
      });
    }
  }

  branch.additionalDeptIds = newExtraDepts;
  await branch.save();
  await branch.populate(POPULATE_BRANCH);
  res.json({ success: true, data: branch });
});

// @desc    Get the branch the current user manages
// @route   GET /api/org/branches/my
export const getMyBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branchId = (req.user as any).branchId;
  if (!branchId) { res.status(404); throw new Error('No branch assigned to your account'); }

  const branch = await Branch.findOne({ _id: branchId, organizationId: req.user.organizationId })
    .populate(POPULATE_BRANCH);

  if (!branch) { res.status(404); throw new Error('Branch not found'); }
  res.json({ success: true, data: branch });
});

// @desc    Delete branch
// @route   DELETE /api/org/branches/:id
export const deleteBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await Branch.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!branch) { res.status(404); throw new Error('Branch not found'); }

  if (branch.salesDeptId) await Department.findByIdAndDelete(branch.salesDeptId);
  if (branch.operationsDeptId) await Department.findByIdAndDelete(branch.operationsDeptId);

  if (branch.branchManagerId) {
    const allDepts = allBranchDeptIds(branch);
    if (allDepts.length) {
      await User.findByIdAndUpdate(branch.branchManagerId, {
        $pullAll: { additionalDepartmentIds: allDepts },
      });
    }
  }

  await branch.deleteOne();
  res.json({ success: true, data: {} });
});
