import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler, resolveOrgId } from '../utils/asyncHandler.js';
import SubDepartment from '../models/SubDepartment.js';
import Department from '../models/Department.js';

// @desc    Create sub-department
// @route   POST /api/ops/sub-departments
// @access  Private (Ops Admin, Org Admin, Superadmin)
export const createSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, parentDeptId, features, assignedUniversities, assignedPrograms, assignedCenters } =
    req.body;

  // Verify parent department exists
  const parentDept = await Department.findById(parentDeptId);
  if (!parentDept) {
    res.status(404);
    throw new Error('Parent department not found');
  }

  if (!name) {
    res.status(400);
    throw new Error('Sub-department name is required');
  }

  // Check if sub-department already exists within the same parent department
  const existing = await SubDepartment.findOne({
    organizationId: req.user.organizationId,
    name,
    parentDeptId,
  });

  if (existing) {
    res.status(400);
    throw new Error(`Sub-department ${name} already exists`);
  }

  const subDepartment = await SubDepartment.create({
    organizationId: req.user.organizationId,
    name,
    parentDeptId,
    features: features || [],
    assignedUniversities: assignedUniversities || [],
    assignedPrograms: assignedPrograms || [],
    assignedCenters: assignedCenters || [],
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: subDepartment,
  });
});

// @desc    Get all sub-departments
// @route   GET /api/ops/sub-departments
// @access  Private
export const getSubDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { parentDeptId, status } = req.query;

  const query: any = { organizationId: req.user.organizationId };

  if (parentDeptId) {
    query.parentDeptId = parentDeptId;
  }

  if (status) {
    query.status = status;
  }

  const subDepartments = await SubDepartment.find(query)
    .populate('parentDeptId', 'name')
    .populate('managerId', 'name')
    .populate('assignedUniversities', 'name code')
    .populate('assignedPrograms', 'name code')
    .populate('assignedCenters', 'name code')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: subDepartments.length,
    data: subDepartments,
  });
});

// @desc    Get single sub-department
// @route   GET /api/ops/sub-departments/:id
// @access  Private
export const getSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDepartment = await SubDepartment.findById(req.params.id)
    .populate('parentDeptId', 'name')
    .populate('managerId', 'name')
    .populate('assignedUniversities', 'name code')
    .populate('assignedPrograms', 'name code duration')
    .populate('assignedCenters', 'name code city');

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to access this sub-department');
  }

  res.status(200).json({
    success: true,
    data: subDepartment,
  });
});

// @desc    Update sub-department
// @route   PATCH /api/ops/sub-departments/:id
// @access  Private (Ops Admin, Org Admin, Superadmin)
export const updateSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { features, assignedUniversities, assignedPrograms, assignedCenters, status, managerId } = req.body;

  const subDepartment = await SubDepartment.findById(req.params.id);

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to update this sub-department');
  }

  const updateFields: any = {};
  if (features !== undefined) updateFields.features = features;
  if (assignedUniversities !== undefined) updateFields.assignedUniversities = assignedUniversities;
  if (assignedPrograms !== undefined) updateFields.assignedPrograms = assignedPrograms;
  if (assignedCenters !== undefined) updateFields.assignedCenters = assignedCenters;
  if (status) updateFields.status = status;
  if (managerId !== undefined) updateFields.managerId = (managerId && managerId !== '') ? managerId : null;

  const updated = await SubDepartment.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: false }
  );

  res.status(200).json({
    success: true,
    data: updated,
  });
});

// @desc    Delete sub-department
// @route   DELETE /api/ops/sub-departments/:id
// @access  Private (Ops Admin, Org Admin, Superadmin)
export const deleteSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDepartment = await SubDepartment.findById(req.params.id);

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to delete this sub-department');
  }

  await subDepartment.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Sub-department deleted successfully',
  });
});

// @desc    Get the current user's sub-department with full populated data + enrollment stats
// @route   GET /api/ops/sub-departments/my
// @access  Private (any employee with subDepartmentId)
export const getMySubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawSubDeptId = (req.user as any).subDepartmentId;
  if (!rawSubDeptId) {
    res.status(404).json({ success: false, message: 'No sub-department assigned to your account' });
    return;
  }
  // Handle both populated object and plain ObjectId
  const subDeptId = typeof rawSubDeptId === 'object' && rawSubDeptId._id
    ? rawSubDeptId._id
    : rawSubDeptId;

  const subDept = await SubDepartment.findById(subDeptId)
    .populate('parentDeptId', 'name type')
    .populate('managerId', 'name email')
    .populate('assignedUniversities', 'name code status')
    .populate('assignedPrograms', 'name code duration status')
    .populate('assignedCenters', 'name code city state status');

  if (!subDept) {
    res.status(404).json({ success: false, message: 'Sub-department not found' });
    return;
  }

  // Enrollment stats for assigned centers (monthly breakdown for last 6 months)
  let enrollmentStats: any[] = [];
  let monthlyEnrollments: any[] = [];

  if (subDept.assignedCenters && subDept.assignedCenters.length > 0) {
    try {
      const Enrollment = (await import('../models/Enrollment.js')).default;
      const centerIds = subDept.assignedCenters.map((c: any) => c._id || c);

      // Total counts per center
      enrollmentStats = await Enrollment.aggregate([
        { $match: { studyCenterId: { $in: centerIds }, organizationId: req.user.organizationId } },
        { $group: {
          _id: '$studyCenterId',
          total: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['payment_pending', 'document_review', 'finance_review']] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $in: ['$status', ['rejected', 'department_rejected']] }, 1, 0] } },
        }},
      ]);

      // Monthly enrollments for last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      monthlyEnrollments = await Enrollment.aggregate([
        { $match: {
          studyCenterId: { $in: centerIds },
          organizationId: req.user.organizationId,
          createdAt: { $gte: sixMonthsAgo },
        }},
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);
    } catch (_) {}
  }

  res.status(200).json({
    success: true,
    data: {
      subDepartment: subDept,
      enrollmentStats,
      monthlyEnrollments,
    },
  });
});
