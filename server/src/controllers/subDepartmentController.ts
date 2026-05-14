import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler, resolveOrgId } from '../utils/asyncHandler.js';
import prisma from '../lib/prisma.js';

// @desc    Create sub-department
// @route   POST /api/ops/sub-departments
// @access  Private (Ops Admin, Org Admin, Superadmin)
export const createSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, parentDeptId, features, assignedUniversities, assignedPrograms, assignedCenters } =
    req.body;

  // Verify parent department exists
  const parentDept = await prisma.department.findUnique({ where: { id: parentDeptId } });
  if (!parentDept) {
    res.status(404);
    throw new Error('Parent department not found');
  }

  if (!name) {
    res.status(400);
    throw new Error('Sub-department name is required');
  }

  const organizationId = resolveOrgId(req.user.organizationId);

  // Check if sub-department already exists within the same parent department
  const existing = await prisma.subDepartment.findUnique({
    where: {
      organizationId_parentDeptId_name: {
        organizationId,
        name,
        parentDeptId,
      }
    }
  });

  if (existing) {
    res.status(400);
    throw new Error(`Sub-department ${name} already exists`);
  }

  const subDepartment = await prisma.subDepartment.create({
    data: {
      organizationId,
      name,
      parentDeptId,
      features: features || [],
      createdBy: req.user.id,
      // Handle relations
      assignedUniversities: assignedUniversities ? { connect: assignedUniversities.map((id: string) => ({ id })) } : undefined,
      assignedPrograms: assignedPrograms ? { connect: assignedPrograms.map((id: string) => ({ id })) } : undefined,
      assignedCenters: assignedCenters ? { connect: assignedCenters.map((id: string) => ({ id })) } : undefined,
    },
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

  const where: any = { organizationId: resolveOrgId(req.user.organizationId) };

  if (parentDeptId) {
    where.parentDeptId = parentDeptId as string;
  }

  if (status) {
    where.status = status as string;
  }

  const subDepartments = await prisma.subDepartment.findMany({
    where,
    include: {
      parentDept: { select: { name: true } },
      manager: { select: { name: true } },
      assignedUniversities: { select: { id: true, name: true, code: true } },
      assignedPrograms: { select: { id: true, name: true, code: true } },
      assignedCenters: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: 'asc' }
  });

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
  const subDepartment = await prisma.subDepartment.findUnique({
    where: { id: req.params.id },
    include: {
      parentDept: { select: { name: true } },
      manager: { select: { name: true } },
      assignedUniversities: { select: { id: true, name: true, code: true } },
      assignedPrograms: { select: { id: true, name: true, code: true, duration: true } },
      assignedCenters: { select: { id: true, name: true, code: true, city: true } },
    }
  });

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId !== resolveOrgId(req.user.organizationId)) {
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

  const subDepartment = await prisma.subDepartment.findUnique({ where: { id: req.params.id } });

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to update this sub-department');
  }

  const data: any = {};
  if (features !== undefined) data.features = features;
  if (status) data.status = status;
  if (managerId !== undefined) data.managerId = (managerId && managerId !== '') ? managerId : null;

  // Handle relation updates (set/disconnect/connect)
  if (assignedUniversities !== undefined) data.assignedUniversities = { set: assignedUniversities.map((id: string) => ({ id })) };
  if (assignedPrograms !== undefined) data.assignedPrograms = { set: assignedPrograms.map((id: string) => ({ id })) };
  if (assignedCenters !== undefined) data.assignedCenters = { set: assignedCenters.map((id: string) => ({ id })) };

  const updated = await prisma.subDepartment.update({
    where: { id: req.params.id },
    data
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
});

// @desc    Delete sub-department
// @route   DELETE /api/ops/sub-departments/:id
// @access  Private (Ops Admin, Org Admin, Superadmin)
export const deleteSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDepartment = await prisma.subDepartment.findUnique({ where: { id: req.params.id } });

  if (!subDepartment) {
    res.status(404);
    throw new Error('Sub-department not found');
  }

  // Verify organization
  if (subDepartment.organizationId !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized to delete this sub-department');
  }

  await prisma.subDepartment.delete({ where: { id: req.params.id } });

  res.status(200).json({
    success: true,
    message: 'Sub-department deleted successfully',
  });
});

// @desc    Get the current user's sub-department with full populated data + enrollment stats
// @route   GET /api/ops/sub-departments/my
// @access  Private (any employee with subDepartmentId)
export const getMySubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDeptId = req.user.subDepartmentId;
  if (!subDeptId) {
    res.status(404).json({ success: false, message: 'No sub-department assigned to your account' });
    return;
  }

  const subDept = await prisma.subDepartment.findUnique({
    where: { id: subDeptId },
    include: {
      parentDept: { select: { name: true, type: true } },
      manager: { select: { name: true, email: true } },
      assignedUniversities: { select: { id: true, name: true, code: true, status: true } },
      assignedPrograms: { select: { id: true, name: true, code: true, duration: true, status: true } },
      assignedCenters: { select: { id: true, name: true, code: true, city: true, state: true, status: true } },
    }
  });

  if (!subDept) {
    res.status(404).json({ success: false, message: 'Sub-department not found' });
    return;
  }

  // Enrollment stats for assigned centers (monthly breakdown for last 6 months)
  let enrollmentStats: any[] = [];
  let monthlyEnrollments: any[] = [];

  if (subDept.assignedCenters && subDept.assignedCenters.length > 0) {
    const centerIds = subDept.assignedCenters.map(c => c.id);
    const organizationId = resolveOrgId(req.user.organizationId);

    // Get enrollment counts by status for assigned centers
    const countsByStatus = await prisma.enrollment.groupBy({
      by: ['status'],
      where: {
        organizationId,
        studyCenterId: { in: centerIds }
      },
      _count: true
    });

    enrollmentStats = countsByStatus.map(item => ({
      status: item.status,
      count: item._count
    }));

    // Get last 6 months enrollment trends
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await prisma.enrollment.findMany({
      where: {
        organizationId,
        studyCenterId: { in: centerIds },
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true }
    });

    // Simple grouping by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = new Map<string, number>();

    monthlyData.forEach(e => {
      const date = new Date(e.createdAt);
      const monthLabel = `${months[date.getMonth()]} ${date.getFullYear()}`;
      trendMap.set(monthLabel, (trendMap.get(monthLabel) || 0) + 1);
    });

    monthlyEnrollments = Array.from(trendMap.entries()).map(([month, count]) => ({
      month,
      count
    })).reverse();
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
