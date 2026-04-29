import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branches = await prisma.branch.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { name: 'asc' } });
  res.json({ success: true, count: branches.length, data: branches });
});

export const getBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, data: branch });
});

export const createBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await prisma.branch.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: branch });
});

export const updateBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: branch });
});

export const deleteBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  await prisma.branch.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const assignBranchManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { managerId } = req.body;
  const user = await prisma.user.update({
    where: { id: managerId },
    data: { branchId: req.params.id }
  });
  res.json({ success: true, data: user });
});

export const updateBranchDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Branch model doesn't support departmentIds in schema, ignoring for now
  res.json({ success: true, message: 'Departments update not supported on branch' });
});

export const getMyBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.user.branchId || '' } });
  res.json({ success: true, data: branch });
});
