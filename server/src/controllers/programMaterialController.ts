// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProgramMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const materials = await prisma.programMaterial.findMany({
    where: { 
      programId: req.params.programId, 
      organizationId: req.user.organizationId, 
      isActive: true 
    },
    include: {
      uploader: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: materials.length, data: materials });
});

export const getProgramDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await prisma.program.findUnique({ 
    where: { id: req.params.programId }, 
    include: { university: true } 
  });
  
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  const materials = await prisma.programMaterial.findMany({
    where: { 
      programId: req.params.programId, 
      organizationId: req.user.organizationId, 
      isActive: true 
    },
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const byCategory = materials.reduce((acc: any, material: any) => {
    if (!acc[material.category]) acc[material.category] = [];
    acc[material.category].push(material);
    return acc;
  }, {});

  res.json({ success: true, data: { program, materials, byCategory } });
});

export const uploadProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  let fileUrl = '';
  let fileName = '';

  if (req.body.externalUrl) {
    fileUrl = req.body.externalUrl;
    fileName = 'External Link';
  } else if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
  } else {
    res.status(400).json({ success: false, message: 'Please upload a file or provide an external URL' });
    return;
  }

  const material = await prisma.programMaterial.create({
    data: {
      title: req.body.title || 'Untitled',
      description: req.body.description,
      category: req.body.category || 'study_material',
      semesterNumber: req.body.semesterNumber ? String(req.body.semesterNumber) : null,
      fileUrl,
      fileName,
      isActive: true,
      program: { connect: { id: req.params.programId } },
      organization: { connect: { id: req.user.organizationId } },
      uploader: { connect: { id: req.user.id } }
    }
  });
  res.status(201).json({ success: true, data: material });
});

export const updateProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data: any = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    semesterNumber: req.body.semesterNumber ? String(req.body.semesterNumber) : null,
  };

  if (req.body.externalUrl) {
    data.fileUrl = req.body.externalUrl;
    data.fileName = 'External Link';
  } else if (req.file) {
    data.fileUrl = `/uploads/${req.file.filename}`;
    data.fileName = req.file.originalname;
  }

  const material = await prisma.programMaterial.update({ 
    where: { id: req.params.materialId }, 
    data 
  });
  res.json({ success: true, data: material });
});

export const deleteProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.programMaterial.update({ 
    where: { id: req.params.materialId }, 
    data: { isActive: false } 
  });
  res.json({ success: true, data: {} });
});
