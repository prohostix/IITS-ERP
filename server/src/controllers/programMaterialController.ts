import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProgramMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const materials = await prisma.programMaterial.findMany({
    where: { programId: req.params.programId, organizationId: req.user.organizationId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: materials.length, data: materials });
});

export const getProgramDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.programId }, include: { university: true } });
  res.json({ success: true, data: program });
});

export const uploadProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const material = await prisma.programMaterial.create({
    data: { ...req.body, programId: req.params.programId, organizationId: req.user.organizationId, uploadedBy: req.user.id }
  });
  res.status(201).json({ success: true, data: material });
});

export const updateProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const material = await prisma.programMaterial.update({ where: { id: req.params.materialId }, data: req.body });
  res.json({ success: true, data: material });
});

export const deleteProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programMaterial.update({ where: { id: req.params.materialId }, data: { isActive: false } });
  res.json({ success: true, data: {} });
});
