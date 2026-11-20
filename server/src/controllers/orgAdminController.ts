// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// CEO Panels
export const createCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanel = await prisma.ceoPanel.create({ data: { ...req.body, organizationId: req.user.organizationId, createdBy: req.user.id } });
  res.status(201).json({ success: true, data: ceoPanel });
});
export const getCeoPanels = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanels = await prisma.ceoPanel.findMany({ where: { organizationId: req.user.organizationId }, include: { assignedUser: true } });
  res.json({ success: true, count: ceoPanels.length, data: ceoPanels });
});
export const getCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanel = await prisma.ceoPanel.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: ceoPanel });
});
export const updateCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ceoPanel = await prisma.ceoPanel.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: ceoPanel });
});
export const deleteCeoPanel = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.ceoPanel.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Departments
export const createCustomDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: department });
});
export const getCustomDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const departments = await prisma.department.findMany({ where: { organizationId: req.user.organizationId } });
  res.json({ success: true, count: departments.length, data: departments });
});

// Hierarchy
export const getOrgHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [departments, users] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: req.user.organizationId } }),
    prisma.user.findMany({ where: { organizationId: req.user.organizationId } })
  ]);
  res.json({ success: true, data: { departments, users } });
});
export const assignHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, reportingToId } = req.body;
  const user = await prisma.user.update({ where: { id: userId }, data: { reportingTo: reportingToId } });
  res.json({ success: true, data: user });
});

// Designations
export const getDesignations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designations = await prisma.designation.findMany({
    where: { organizationId: req.user.organizationId, status: { not: 'deleted' } },
    include: {
      department: true,
      subDepartment: true,
      filledBy: {
        where: { status: { notIn: ['resigned', 'deleted', 'inactive'] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
          userId: true
        }
      },
      parentDesignation: {
        select: { id: true, title: true }
      },
      branch: {
        select: { id: true, name: true, code: true }
      }
    }
  });

  // Map relations for frontend compatibility
  const mapped = designations.map(d => ({
    ...d,
    filledBy: d.filledBy || [],
    branchId: d.branch,
    parentDesignationId: d.parentDesignation,
    departmentId: d.department,
    subDepartmentId: d.subDepartment
  }));

  res.json({ success: true, count: mapped.length, data: mapped });
});
export const createDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designation = await prisma.designation.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: designation });
});
export const updateDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const designation = await prisma.designation.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: designation });
});
export const deleteDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.designation.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const assignUserToDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const designationId = req.params.id;
  const orgId = req.user.organizationId;

  // 1. Fetch designation and its parent designation
  const designation = await prisma.designation.findUnique({
    where: { id: designationId },
    select: { id: true, title: true, parentDesignationId: true, branchId: true, departmentId: true, subDepartmentId: true }
  });

  // 2. Determine who the user should report to (holder of parent designation)
  let parentUserId: string | null = null;
  if (designation?.parentDesignationId) {
    const parentUser = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        designationId: designation.parentDesignationId,
        status: 'active'
      },
      select: { id: true }
    });
    if (parentUser) {
      parentUserId = parentUser.id;
    }
  }

  // 3. Assign user to this designation and update reportingTo, title, department, and branch
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      designationId,
      ...(designation?.title ? { designation: designation.title } : {}),
      ...(designation?.departmentId ? { departmentId: designation.departmentId } : {}),
      ...(designation?.subDepartmentId ? { subDepartmentId: designation.subDepartmentId } : {}),
      ...(designation?.branchId ? { branchId: designation.branchId } : {}),
      reportingTo: parentUserId
    }
  });

  // 4. Update child designation holders so their reportingTo points to this user
  const childDesignations = await prisma.designation.findMany({
    where: { organizationId: orgId, parentDesignationId: designationId, status: { not: 'deleted' } },
    select: { id: true }
  });
  if (childDesignations.length > 0) {
    const childDesigIds = childDesignations.map(cd => cd.id);
    await prisma.user.updateMany({
      where: {
        organizationId: orgId,
        designationId: { in: childDesigIds }
      },
      data: {
        reportingTo: user.id
      }
    });
  }

  // 5. If an open Vacancy matches this designation, increment filled count
  if (designation?.title) {
    try {
      const openVacancy = await prisma.vacancy.findFirst({
        where: {
          organizationId: orgId,
          status: 'open',
          designation: { equals: designation.title, mode: 'insensitive' },
          ...(designation.departmentId ? { departmentId: designation.departmentId } : {})
        },
        orderBy: { createdAt: 'asc' }
      });
      if (openVacancy && (openVacancy.filled || 0) < (openVacancy.count || 1)) {
        const nextFilled = (openVacancy.filled || 0) + 1;
        await prisma.vacancy.update({
          where: { id: openVacancy.id },
          data: {
            filled: nextFilled,
            ...(nextFilled >= (openVacancy.count || 1) ? { status: 'closed' } : {})
          }
        });
      }
    } catch (_e) {}
  }

  res.json({ success: true, data: user });
});

export const unassignUserFromDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  const orgId = req.user.organizationId;

  // 1. Clear user's designationId and reportingTo
  const user = await prisma.user.update({
    where: { id: userId },
    data: { designationId: null, reportingTo: null }
  });

  // 2. Clear reportingTo for any users that reported to this user
  await prisma.user.updateMany({
    where: {
      organizationId: orgId,
      reportingTo: userId
    },
    data: { reportingTo: null }
  });

  res.json({ success: true, data: user });
});

export const syncAllHierarchyReporting = async (organizationId: string): Promise<number> => {
  const [designations, users] = await Promise.all([
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true, branchId: true }
    }),
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' }, designationId: { not: null } },
      select: { id: true, designationId: true, branchId: true, name: true }
    })
  ]);

  const desigToUserMap = new Map<string, string>();
  for (const u of users) {
    if (u.designationId) {
      desigToUserMap.set(u.designationId, u.id);
    }
  }

  const desigParentMap = new Map<string, string | null>();
  for (const d of designations) {
    desigParentMap.set(d.id, d.parentDesignationId);
  }

  let updatedCount = 0;
  for (const u of users) {
    if (!u.designationId) continue;
    const parentDesigId = desigParentMap.get(u.designationId);
    let managerId: string | null = null;
    if (parentDesigId && desigToUserMap.has(parentDesigId)) {
      managerId = desigToUserMap.get(parentDesigId)!;
    }
    if (managerId !== u.id) {
      await prisma.user.update({
        where: { id: u.id },
        data: { reportingTo: managerId }
      });
      updatedCount++;
    }
  }
  return updatedCount;
};

export const syncHierarchyReporting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const updatedCount = await syncAllHierarchyReporting(orgId);
  res.json({ success: true, message: `Synchronized reporting chain for ${updatedCount} users.`, updatedCount });
});

/**
 * Ensures an open position node (Designation) exists in the Org Chart hierarchy
 * with enough available capacity (maxHeadcount >= activeFilled + count).
 */
export async function ensureOpenPositionInHierarchy(options: {
  organizationId: string;
  title: string;
  count: number;
  designationId?: string | null;
  parentDesignationId?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  branchId?: string | null;
  requestedByUserId?: string | null;
}) {
  const { organizationId } = options;
  const requestedCount = Math.max(1, Number(options.count) || 1);
  const cleanTitle = (options.title || 'Open Position').trim();

  let requester: any = null;
  if (options.requestedByUserId) {
    requester = await prisma.user.findUnique({
      where: { id: options.requestedByUserId },
      include: { designationRef: true }
    });
  }

  // 1. If a specific designationId was passed, try to load it
  if (options.designationId) {
    const existingById = await prisma.designation.findFirst({
      where: { id: options.designationId, organizationId, status: { not: 'deleted' } },
      include: {
        filledBy: {
          where: { status: { notIn: ['resigned', 'deleted', 'inactive'] } },
          select: { id: true }
        }
      }
    });
    if (existingById) {
      const activeFilled = existingById.filledBy?.length || 0;
      const targetMax = Math.max(existingById.maxHeadcount || 1, activeFilled + requestedCount);
      const updated = await prisma.designation.update({
        where: { id: existingById.id },
        data: { maxHeadcount: targetMax, status: 'active' }
      });
      return updated;
    }
  }

  // 2. Resolve parentDesignationId, branchId, departmentId, subDepartmentId
  let effectiveParentId = options.parentDesignationId || requester?.designationId || null;
  let effectiveBranchId = options.branchId || requester?.branchId || requester?.designationRef?.branchId || null;
  let effectiveDeptId = options.departmentId || requester?.departmentId || requester?.designationRef?.departmentId || null;
  let effectiveSubDeptId = options.subDepartmentId || requester?.subDepartmentId || requester?.designationRef?.subDepartmentId || null;
  let parentLevel = 1;

  if (effectiveParentId) {
    const parentDesig = await prisma.designation.findUnique({
      where: { id: effectiveParentId }
    });
    if (parentDesig) {
      parentLevel = parentDesig.level || 1;
      if (!effectiveBranchId) effectiveBranchId = parentDesig.branchId;
      if (!effectiveDeptId) effectiveDeptId = parentDesig.departmentId;
      if (!effectiveSubDeptId) effectiveSubDeptId = parentDesig.subDepartmentId;
    }
  } else if (effectiveDeptId) {
    // Find top-level designation in this department/branch to act as parent if none specified
    const deptHeadDesig = await prisma.designation.findFirst({
      where: {
        organizationId,
        departmentId: effectiveDeptId,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        status: { not: 'deleted' }
      },
      orderBy: { level: 'asc' }
    });
    if (deptHeadDesig && deptHeadDesig.title.toLowerCase() !== cleanTitle.toLowerCase()) {
      effectiveParentId = deptHeadDesig.id;
      parentLevel = deptHeadDesig.level || 1;
      if (!effectiveBranchId) effectiveBranchId = deptHeadDesig.branchId;
    }
  }

  // 3. Check if a Designation with the same title already exists in this scope
  const existingByTitle = await prisma.designation.findFirst({
    where: {
      organizationId,
      status: { not: 'deleted' },
      title: { equals: cleanTitle, mode: 'insensitive' },
      ...(effectiveParentId ? { parentDesignationId: effectiveParentId } : {}),
      ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {})
    },
    include: {
      filledBy: {
        where: { status: { notIn: ['resigned', 'deleted', 'inactive'] } },
        select: { id: true }
      }
    }
  });

  if (existingByTitle) {
    const activeFilled = existingByTitle.filledBy?.length || 0;
    const targetMax = Math.max(existingByTitle.maxHeadcount || 1, activeFilled + requestedCount);
    const updated = await prisma.designation.update({
      where: { id: existingByTitle.id },
      data: { maxHeadcount: targetMax, status: 'active' }
    });
    return updated;
  }

  // 4. Create a new Designation node in the Org Chart
  const created = await prisma.designation.create({
    data: {
      organizationId,
      title: cleanTitle,
      level: effectiveParentId ? parentLevel + 1 : 1,
      parentDesignationId: effectiveParentId,
      departmentId: effectiveDeptId,
      subDepartmentId: effectiveSubDeptId,
      branchId: effectiveBranchId,
      maxHeadcount: requestedCount,
      status: 'active'
    }
  });

  return created;
}

/**
 * Assigns a newly hired user to their corresponding Org Chart Designation node,
 * sets their reportingTo manager from the parent designation holder,
 * and ensures an EmployeeProfile exists.
 */
export async function assignHireToHierarchyPosition(options: {
  organizationId: string;
  userId: string;
  designationId?: string | null;
  title?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  employmentRole?: string | null;
  joinDate?: Date | string | null;
}) {
  const { organizationId, userId } = options;

  let targetDesig: any = null;
  if (options.designationId) {
    targetDesig = await prisma.designation.findFirst({
      where: { id: options.designationId, organizationId, status: { not: 'deleted' } },
      include: {
        filledBy: {
          where: { status: { notIn: ['resigned', 'deleted', 'inactive'] } },
          select: { id: true }
        }
      }
    });
  }

  if (!targetDesig && options.title) {
    const candidates = await prisma.designation.findMany({
      where: {
        organizationId,
        status: { not: 'deleted' },
        title: { equals: options.title.trim(), mode: 'insensitive' },
        ...(options.departmentId ? { departmentId: options.departmentId } : {}),
        ...(options.branchId ? { branchId: options.branchId } : {})
      },
      include: {
        filledBy: {
          where: { status: { notIn: ['resigned', 'deleted', 'inactive'] } },
          select: { id: true }
        }
      }
    });
    // Prefer a designation node that currently has an open slot
    targetDesig =
      candidates.find(c => (c.filledBy?.length || 0) < (c.maxHeadcount || 1)) ||
      candidates[0] ||
      null;
  }

  if (!targetDesig && options.title) {
    // Create the designation node if it somehow didn't exist yet
    targetDesig = await ensureOpenPositionInHierarchy({
      organizationId,
      title: options.title,
      count: 1,
      departmentId: options.departmentId,
      branchId: options.branchId
    });
  }

  let parentUserId: string | null = null;
  if (targetDesig?.parentDesignationId) {
    const parentUser = await prisma.user.findFirst({
      where: {
        organizationId,
        designationId: targetDesig.parentDesignationId,
        status: 'active'
      },
      select: { id: true }
    });
    if (parentUser && parentUser.id !== userId) {
      parentUserId = parentUser.id;
    }
  }

  if (targetDesig) {
    const activeFilled = (targetDesig.filledBy || []).filter((u: any) => u.id !== userId).length;
    if ((targetDesig.maxHeadcount || 1) < activeFilled + 1) {
      await prisma.designation.update({
        where: { id: targetDesig.id },
        data: { maxHeadcount: activeFilled + 1 }
      });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(targetDesig ? {
        designationId: targetDesig.id,
        designation: targetDesig.title,
        ...(targetDesig.departmentId ? { departmentId: targetDesig.departmentId } : {}),
        ...(targetDesig.subDepartmentId ? { subDepartmentId: targetDesig.subDepartmentId } : {}),
        ...(targetDesig.branchId ? { branchId: targetDesig.branchId } : {})
      } : {}),
      ...(parentUserId ? { reportingTo: parentUserId } : {})
    }
  });

  // Update child designation holders if any
  if (targetDesig?.id) {
    const childDesignations = await prisma.designation.findMany({
      where: { organizationId, parentDesignationId: targetDesig.id, status: { not: 'deleted' } },
      select: { id: true }
    });
    if (childDesignations.length > 0) {
      await prisma.user.updateMany({
        where: {
          organizationId,
          designationId: { in: childDesignations.map(cd => cd.id) },
          reportingTo: null
        },
        data: { reportingTo: updatedUser.id }
      });
    }
  }

  // Ensure EmployeeProfile exists for the hired user
  const existingProfile = await prisma.employeeProfile.findUnique({
    where: { userId: updatedUser.id }
  });
  if (!existingProfile) {
    await prisma.employeeProfile.create({
      data: {
        organizationId,
        userId: updatedUser.id,
        employmentType: 'full_time',
        employmentRole: (options.employmentRole as any) || 'probation',
        inductionStatus: 'pending',
        joinDate: options.joinDate ? new Date(options.joinDate) : new Date()
      }
    });
  }

  return { user: updatedUser, designation: targetDesig };
}
