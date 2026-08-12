// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId || req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true, department: true }
  });
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId }
  });
  const salaryConfig = await prisma.salaryConfig.findUnique({
    where: { userId }
  });
  res.json({ success: true, data: { user, profile, salaryConfig } });
});

export const upsertEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  
  // Format dates correctly before saving
  const dataToSave = { ...req.body };
  if (dataToSave.dateOfBirth) dataToSave.dateOfBirth = new Date(dataToSave.dateOfBirth);
  if (dataToSave.joinDate) dataToSave.joinDate = new Date(dataToSave.joinDate);
  if (dataToSave.confirmationDate) dataToSave.confirmationDate = new Date(dataToSave.confirmationDate);
  if (dataToSave.probationEndDate) dataToSave.probationEndDate = new Date(dataToSave.probationEndDate);
  if (dataToSave.lastReviewDate) dataToSave.lastReviewDate = new Date(dataToSave.lastReviewDate);
  if (dataToSave.nextReviewDate) dataToSave.nextReviewDate = new Date(dataToSave.nextReviewDate);

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: dataToSave,
    create: { ...dataToSave, userId, organizationId: req.user.organizationId }
  });
  res.json({ success: true, data: profile });
});

export const updateKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kpis: req.body.kpis },
    create: { userId, organizationId: req.user.organizationId, kpis: req.body.kpis }
  });
  res.json({ success: true, data: profile });
});

export const updateKRAs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kras: req.body.kras },
    create: { userId, organizationId: req.user.organizationId, kras: req.body.kras }
  });
  res.json({ success: true, data: profile });
});

export const updateSalaryDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { salaryConfig, ctc, basicSalary, bankName, bankAccountNo, ifscCode, panNumber } = req.body;

  const profileData = { 
    ctc: ctc ? Number(ctc) : null,
    basicSalary: basicSalary ? Number(basicSalary) : null,
    bankName, 
    bankAccountNo, 
    ifscCode, 
    panNumber 
  };

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: profileData,
    create: { ...profileData, userId, organizationId: req.user.organizationId }
  });

  let config = null;
  if (salaryConfig) {
    config = await prisma.salaryConfig.upsert({
      where: { userId },
      update: {
        basicSalary: salaryConfig.basicSalary ? Number(salaryConfig.basicSalary) : 0,
        allowances: salaryConfig.allowances || {},
        deductions: salaryConfig.deductions || {},
        lateDeductionPerMinute: salaryConfig.lateDeductionPerMinute ? Number(salaryConfig.lateDeductionPerMinute) : 0,
      },
      create: {
        userId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        basicSalary: salaryConfig.basicSalary ? Number(salaryConfig.basicSalary) : 0,
        allowances: salaryConfig.allowances || {},
        deductions: salaryConfig.deductions || {},
        lateDeductionPerMinute: salaryConfig.lateDeductionPerMinute ? Number(salaryConfig.lateDeductionPerMinute) : 0,
      }
    });
  }

  res.json({ success: true, data: { profile, salaryConfig: config } });
});
