// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function checkProfileAccess(req: AuthRequest, targetUserId: string): boolean {
  if (!req.user) return false;
  if (req.user.id === targetUserId) return true;
  if (['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager', 'finance_admin'].includes(req.user.role)) {
    return true;
  }
  const deptType = req.user.department?.type || req.user.subDepartment?.parentDept?.type;
  if (req.user.role === 'employee' && deptType === 'hr') return true;
  return false;
}

async function resolveProfileOrgId(req: AuthRequest, targetUserId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: targetUserId }, select: { organizationId: true } });
  if (u?.organizationId) return u.organizationId;
  if (req.user?.organizationId) return req.user.organizationId;
  const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
  return firstOrg?.id || null;
}

export const getEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = !req.params.userId || req.params.userId === 'me' ? req.user.id : req.params.userId;
  if (!checkProfileAccess(req, userId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const [user, profile, salaryConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, department: true },
    }),
    prisma.employeeProfile.findUnique({
      where: { userId },
      include: { shift: true },
    }),
    prisma.salaryConfig.findUnique({
      where: { userId },
    }),
  ]);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Employee user not found' });
  }

  res.json({
    success: true,
    data: {
      user: { ...user, departmentId: user.department || user.departmentId },
      profile,
      salaryConfig,
    },
  });
});

export const upsertEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = !req.params.userId || req.params.userId === 'me' ? req.user.id : req.params.userId;
  if (!checkProfileAccess(req, userId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const orgId = await resolveProfileOrgId(req, userId);
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization not found' });
  }

  const allowedKeys = [
    'dateOfBirth', 'gender', 'bloodGroup', 'address', 'city', 'state', 'pincode',
    'emergencyContact', 'employeeCode', 'joinDate', 'confirmationDate', 'probationEndDate',
    'employmentType', 'employmentRole', 'inductionStatus', 'workLocation', 'reportingManagerId',
    'ctc', 'basicSalary', 'bankName', 'bankAccountNo', 'ifscCode', 'panNumber',
    'documents', 'kpis', 'kras', 'lastReviewDate', 'nextReviewDate', 'overallRating',
    'reviewRemarks', 'shiftId', 'lateDeductionEnabled', 'resignationDate',
  ];

  const dataToSave: Record<string, any> = {};
  for (const k of allowedKeys) {
    if (req.body[k] !== undefined) {
      dataToSave[k] = req.body[k];
    }
  }

  const dateFields = ['dateOfBirth', 'joinDate', 'confirmationDate', 'probationEndDate', 'lastReviewDate', 'nextReviewDate', 'resignationDate'];
  for (const df of dateFields) {
    if (dataToSave[df] !== undefined) {
      if (!dataToSave[df]) {
        dataToSave[df] = null;
      } else {
        const d = new Date(dataToSave[df]);
        dataToSave[df] = isNaN(d.getTime()) ? undefined : d;
      }
    }
  }

  if (dataToSave.shiftId === 'default' || dataToSave.shiftId === 'none' || dataToSave.shiftId === '') {
    dataToSave.shiftId = null;
  }
  if (dataToSave.lateDeductionEnabled !== undefined) {
    dataToSave.lateDeductionEnabled = Boolean(dataToSave.lateDeductionEnabled);
  }
  if (dataToSave.ctc !== undefined) {
    dataToSave.ctc = dataToSave.ctc !== '' && dataToSave.ctc !== null ? Number(dataToSave.ctc) : null;
  }
  if (dataToSave.basicSalary !== undefined) {
    dataToSave.basicSalary = dataToSave.basicSalary !== '' && dataToSave.basicSalary !== null ? Number(dataToSave.basicSalary) : null;
  }

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: dataToSave,
    create: { ...dataToSave, userId, organizationId: orgId },
    include: { shift: true },
  });

  if (dataToSave.lateDeductionEnabled !== undefined) {
    await prisma.salaryConfig.updateMany({
      where: { userId },
      data: { lateDeductionEnabled: dataToSave.lateDeductionEnabled },
    });
  }

  res.json({ success: true, data: profile });
});

export const uploadEmployeeDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = !req.params.userId || req.params.userId === 'me' ? req.user.id : req.params.userId;
  if (!checkProfileAccess(req, userId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const orgId = await resolveProfileOrgId(req, userId);
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization not found' });
  }

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.url;
  if (!fileUrl) {
    return res.status(400).json({ success: false, message: 'Please provide a document file to upload.' });
  }

  const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId } });
  const existingDocs = Array.isArray(existingProfile?.documents) ? [...(existingProfile!.documents as any[])] : [];

  const category = String(req.body.category || 'Other Document').trim();
  const title = String(req.body.title || '').trim() || category;
  const newDoc = {
    id: `doc-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title,
    category,
    documentNumber: req.body.documentNumber ? String(req.body.documentNumber).trim() : '',
    notes: req.body.notes ? String(req.body.notes).trim() : '',
    url: fileUrl,
    fileName: req.file ? req.file.originalname : (req.body.fileName || ''),
    fileSize: req.file ? req.file.size : undefined,
    mimeType: req.file ? req.file.mimetype : undefined,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user?.name || req.user?.id,
  };

  const updatedDocs = [newDoc, ...existingDocs];
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { documents: updatedDocs },
    create: { userId, organizationId: orgId, documents: updatedDocs },
  });

  res.status(201).json({ success: true, data: newDoc, documents: profile.documents });
});

export const updateEmployeeDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = !req.params.userId || req.params.userId === 'me' ? req.user.id : req.params.userId;
  const { docId } = req.params;
  if (!checkProfileAccess(req, userId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId } });
  if (!existingProfile) {
    return res.status(404).json({ success: false, message: 'Employee profile not found' });
  }

  const docs = Array.isArray(existingProfile.documents) ? [...(existingProfile.documents as any[])] : [];
  const idx = docs.findIndex((d, i) => String(d.id ?? i) === String(docId));
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const current = docs[idx];
  const nextUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.url || current.url);
  const nextFileName = req.file ? req.file.originalname : (req.body.fileName ?? current.fileName);

  docs[idx] = {
    ...current,
    id: current.id || `doc-${Date.now()}`,
    title: req.body.title !== undefined ? String(req.body.title).trim() || current.title : current.title,
    category: req.body.category !== undefined ? String(req.body.category).trim() : current.category,
    documentNumber: req.body.documentNumber !== undefined ? String(req.body.documentNumber).trim() : (current.documentNumber || ''),
    notes: req.body.notes !== undefined ? String(req.body.notes).trim() : (current.notes || ''),
    url: nextUrl,
    fileName: nextFileName,
    ...(req.file ? { fileSize: req.file.size, mimeType: req.file.mimetype } : {}),
    updatedAt: new Date().toISOString(),
  };

  const profile = await prisma.employeeProfile.update({
    where: { userId },
    data: { documents: docs },
  });

  res.json({ success: true, data: docs[idx], documents: profile.documents });
});

export const deleteEmployeeDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = !req.params.userId || req.params.userId === 'me' ? req.user.id : req.params.userId;
  const { docId } = req.params;
  if (!checkProfileAccess(req, userId)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId } });
  if (!existingProfile) {
    return res.status(404).json({ success: false, message: 'Employee profile not found' });
  }

  const docs = Array.isArray(existingProfile.documents) ? (existingProfile.documents as any[]) : [];
  const filtered = docs.filter((d, i) => String(d.id ?? i) !== String(docId));

  const profile = await prisma.employeeProfile.update({
    where: { userId },
    data: { documents: filtered },
  });

  res.json({ success: true, documents: profile.documents });
});

export const updateKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = await resolveProfileOrgId(req, userId);
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kpis: req.body.kpis || [] },
    create: { userId, organizationId: orgId!, kpis: req.body.kpis || [] }
  });
  res.json({ success: true, data: profile });
});

export const updateKRAs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = await resolveProfileOrgId(req, userId);
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kras: req.body.kras || [] },
    create: { userId, organizationId: orgId!, kras: req.body.kras || [] }
  });
  res.json({ success: true, data: profile });
});

export const updateSalaryDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { salaryConfig, ctc, basicSalary, bankName, bankAccountNo, ifscCode, panNumber, uanNumber, previousEsiNumber, lwfNumber } = req.body;
  const orgId = await resolveProfileOrgId(req, userId);

  const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId } });
  const existingContact = (existingProfile?.emergencyContact as any) || {};
  const updatedContact = {
    ...existingContact,
    ...(uanNumber !== undefined ? { uanNumber: String(uanNumber).trim() } : {}),
    ...(previousEsiNumber !== undefined ? { previousEsiNumber: String(previousEsiNumber).trim() } : {}),
    ...(lwfNumber !== undefined ? { lwfNumber: String(lwfNumber).trim() } : {}),
  };

  const lateEnabled =
    salaryConfig?.lateDeductionEnabled !== undefined
      ? Boolean(salaryConfig.lateDeductionEnabled)
      : undefined;

  const profileData: any = {
    ctc: ctc ? Number(ctc) : null,
    basicSalary: basicSalary ? Number(basicSalary) : null,
    bankName,
    bankAccountNo,
    ifscCode,
    panNumber,
    emergencyContact: updatedContact,
    ...(lateEnabled !== undefined ? { lateDeductionEnabled: lateEnabled } : {}),
  };

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: profileData,
    create: { ...profileData, userId, organizationId: orgId! }
  });

  let config = null;
  if (salaryConfig) {
    config = await prisma.salaryConfig.upsert({
      where: { userId },
      update: {
        basicSalary: salaryConfig.basicSalary ? Number(salaryConfig.basicSalary) : 0,
        allowances: salaryConfig.allowances || {},
        deductions: salaryConfig.deductions || {},
        professionalTax: salaryConfig.professionalTax ? Number(salaryConfig.professionalTax) : 0,
        labourWelfareFund: salaryConfig.labourWelfareFund ? Number(salaryConfig.labourWelfareFund) : 0,
        tds: salaryConfig.tds ? Number(salaryConfig.tds) : 0,
        lateDeductionPerMinute: salaryConfig.lateDeductionPerMinute ? Number(salaryConfig.lateDeductionPerMinute) : 0,
        ...(lateEnabled !== undefined ? { lateDeductionEnabled: lateEnabled } : {}),
        effectiveFrom: salaryConfig.effectiveFrom ? new Date(salaryConfig.effectiveFrom) : null,
      },
      create: {
        userId,
        organizationId: orgId!,
        createdBy: req.user.id,
        basicSalary: salaryConfig.basicSalary ? Number(salaryConfig.basicSalary) : 0,
        allowances: salaryConfig.allowances || {},
        deductions: salaryConfig.deductions || {},
        professionalTax: salaryConfig.professionalTax ? Number(salaryConfig.professionalTax) : 0,
        labourWelfareFund: salaryConfig.labourWelfareFund ? Number(salaryConfig.labourWelfareFund) : 0,
        tds: salaryConfig.tds ? Number(salaryConfig.tds) : 0,
        lateDeductionPerMinute: salaryConfig.lateDeductionPerMinute ? Number(salaryConfig.lateDeductionPerMinute) : 0,
        lateDeductionEnabled: lateEnabled !== undefined ? lateEnabled : true,
        effectiveFrom: salaryConfig.effectiveFrom ? new Date(salaryConfig.effectiveFrom) : null,
      }
    });
  }

  res.json({ success: true, data: { profile, salaryConfig: config } });
});
