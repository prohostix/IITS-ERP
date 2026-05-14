import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branches = await prisma.branch.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      branchManager: {
        select: { id: true, name: true, email: true, role: true, userId: true, designation: true }
      },
      salesDept: true,
      operationsDept: true,
      additionalDepts: true,
    },
    orderBy: { name: 'asc' }
  });

  // Map additionalDepts to additionalDeptIds for frontend compatibility
  const mapped = branches.map((b: any) => ({
    ...b,
    additionalDeptIds: b.additionalDepts,
    branchManagerId: b.branchManager
  }));

  res.json({ success: true, count: mapped.length, data: mapped });
});

export const getBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch: any = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      branchManager: true,
      salesDept: true,
      operationsDept: true,
      additionalDepts: true
    }
  });
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDepts, branchManagerId: branch.branchManager } });
});

export const createBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, address, city, state, branchManagerId } = req.body;

  // 1. Create the branch
  const branch = await prisma.branch.create({
    data: {
      name,
      code,
      address,
      city,
      state,
      organizationId: req.user.organizationId,
      branchManagerId: branchManagerId || undefined
    }
  });

  // 2. Create default departments for this branch
  const [sales, ops] = await Promise.all([
    prisma.department.create({
      data: {
        name: `${name} Sales`,
        type: 'sales' as any,
        organizationId: req.user.organizationId
      }
    }),
    prisma.department.create({
      data: {
        name: `${name} Operations`,
        type: 'operations' as any,
        organizationId: req.user.organizationId
      }
    })
  ]);

  // 3. Link them back to the branch
  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: {
      salesDeptId: sales.id,
      operationsDeptId: ops.id
    },
    include: { salesDept: true, operationsDept: true }
  });

  res.status(201).json({ success: true, data: updated });
});

export const updateBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await prisma.branch.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json({ success: true, data: branch });
});

export const deleteBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.branch.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const assignBranchManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, additionalDeptIds } = req.body;
  const branch: any = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      branchManagerId: userId || null,
      additionalDepts: {
        set: (additionalDeptIds || []).map((id: string) => ({ id }))
      }
    },
    include: { additionalDepts: true }
  });
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDepts, branchManagerId: branch.branchManager } });
});

export const updateBranchDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { additionalDeptIds } = req.body;
  const branch: any = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      additionalDepts: {
        set: (additionalDeptIds || []).map((id: string) => ({ id }))
      }
    },
    include: { additionalDepts: true }
  });
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDepts, branchManagerId: branch.branchManager } });
});

export const getMyBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch: any = await prisma.branch.findUnique({
    where: { id: req.user.branchId || '' },
    include: { salesDept: true, operationsDept: true, additionalDepts: true }
  });
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch?.additionalDepts || [] } });
});
