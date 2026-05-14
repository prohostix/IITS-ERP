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
      users: {
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
    filledBy: d.users || [],
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
  const user = await prisma.user.update({ where: { id: req.body.userId }, data: { designationId: req.params.id } });
  res.json({ success: true, data: user });
});
export const unassignUserFromDesignation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.update({ where: { id: req.body.userId }, data: { designationId: null } });
  res.json({ success: true, data: user });
});
