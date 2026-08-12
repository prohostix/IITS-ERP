// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await prisma.salaryConfig.findMany({
    where: { organizationId: req.user.organizationId },
    include: { user: { select: { name: true, email: true, designation: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await prisma.salaryConfig.findMany({
    where: { organizationId: req.user.organizationId, approvalStatus: 'pending_approval' },
    include: { user: { select: { name: true, email: true, designation: true } } }
  });
  res.json({ success: true, count: configs.length, data: configs });
});

export const getSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  res.json({ success: true, data: config });
});

export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { effectiveFrom, ...salaryData } = req.body;
  const config = await prisma.salaryConfig.upsert({
    where: { userId: req.params.userId },
    update: { ...salaryData, organizationId: req.user.organizationId, createdBy: req.user.id },
    create: { ...salaryData, userId: req.params.userId, organizationId: req.user.organizationId, createdBy: req.user.id }
  });
  res.json({ success: true, data: config });
});

export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.findUnique({ where: { userId: req.params.userId } });
  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }
  await prisma.salaryConfig.delete({ where: { userId: req.params.userId } });
  res.json({ success: true, data: {} });
});

export const getLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocations = await prisma.leaveAllocation.findMany({
    where: { organizationId: req.user.organizationId, year },
    include: { user: { select: { name: true, email: true, role: true, designation: true } } }
  });

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: 'approved',
      startDate: { gte: startDate },
      endDate: { lte: endDate }
    }
  });

  const data = allocations.map(alloc => {
    const userLeaves = leaveRequests.filter(lr => lr.userId === alloc.userId);
    let usedSick = 0, usedCasual = 0, usedEarned = 0, usedComplementary = 0;
    
    for (const lr of userLeaves) {
      const days = Math.ceil((new Date(lr.endDate).getTime() - new Date(lr.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (lr.type === 'sick') usedSick += days;
      else if (lr.type === 'casual') usedCasual += days;
      else if (lr.type === 'earned') usedEarned += days;
      // complementary doesn't exist in enum, ignore for now or check if added
    }

    return {
      ...alloc,
      usedSick,
      usedCasual,
      usedEarned,
      usedComplementary
    };
  });

  res.json({ success: true, count: data.length, data });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocation = await prisma.leaveAllocation.findUnique({
    where: { userId_year: { userId: req.params.userId, year } }
  });
  res.json({ success: true, data: allocation });
});

export const upsertLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.body.year) || new Date().getFullYear();
  const allocation = await prisma.leaveAllocation.upsert({
    where: { userId_year: { userId: req.params.userId, year } },
    update: { ...req.body, createdBy: req.user.id },
    create: { ...req.body, userId: req.params.userId, organizationId: req.user.organizationId, year, createdBy: req.user.id }
  });
  res.json({ success: true, data: allocation });
});

export const bulkInitLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year = new Date().getFullYear(), casual, sick, earned } = req.body;
  const casualNum = Number(casual) || 0;
  const sickNum = Number(sick) || 0;
  const earnedNum = Number(earned) || 0;
  const users = await prisma.user.findMany({ where: { organizationId: req.user.organizationId, status: 'active' as any } });
  
  const results = await Promise.all(users.map(u => 
    prisma.leaveAllocation.upsert({
      where: { userId_year: { userId: u.id, year } },
      update: { casualLeave: casualNum, sickLeave: sickNum, earnedLeave: earnedNum },
      create: { userId: u.id, organizationId: req.user.organizationId, year, casualLeave: casualNum, sickLeave: sickNum, earnedLeave: earnedNum, createdBy: req.user.id }
    })
  ));

  res.json({ success: true, message: `Initialized for ${results.length} users` });
});

export const generateSmartPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Smart payroll logic not implemented' });
});

export const approveSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await prisma.salaryConfig.update({
    where: { id: req.params.id },
    data: { approvalStatus: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
  });
  res.json({ success: true, data: config });
});
