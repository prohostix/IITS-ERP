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
    where: { organizationId: req.user.organizationId },
    include: {
      department: true,
      subDepartment: true,
      filledBy: {
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
    select: { id: true, parentDesignationId: true, branchId: true }
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

  // 3. Assign user to this designation and update reportingTo
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      designationId,
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
