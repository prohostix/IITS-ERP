import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import ProgramMaterial from '../models/ProgramMaterial.js';
import Program from '../models/Program.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/operations/programs/:programId/materials
export const getProgramMaterials = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId } = req.params;

  const query: any = {
    programId,
    organizationId: req.user.organizationId,
    isActive: true,
  };

  if (req.query.category) query.category = req.query.category;
  if (req.query.semester) query.semesterNumber = Number(req.query.semester);

  const materials = await ProgramMaterial.find(query)
    .populate('uploadedBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: materials.length, data: materials });
});

// GET /api/operations/programs/:programId/detail
// Full program detail with materials grouped by category
export const getProgramDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId } = req.params;

  const program = await Program.findOne({
    _id: programId,
    organizationId: req.user.organizationId,
  })
    .populate('universityId', 'name code')
    .populate('subDepartmentId', 'name');

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  const materials = await ProgramMaterial.find({
    programId,
    organizationId: req.user.organizationId,
    isActive: true,
  })
    .populate('uploadedBy', 'name email')
    .sort('category createdAt');

  // Group by category
  const byCategory: Record<string, any[]> = {};
  materials.forEach(m => {
    const cat = m.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m);
  });

  res.status(200).json({
    success: true,
    data: {
      program,
      materials,
      byCategory,
      totalMaterials: materials.length,
    },
  });
});

// POST /api/operations/programs/:programId/materials
// Upload material files to a program (ops_admin, ops_sub_admin, employee)
export const uploadProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { programId } = req.params;
  const { title, description, category, semesterNumber } = req.body;

  // Validate program exists in this org
  const program = await Program.findOne({
    _id: programId,
    organizationId: req.user.organizationId,
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  if (!title) {
    res.status(400).json({ success: false, message: 'Title is required' });
    return;
  }

  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[0] || (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    res.status(400).json({ success: false, message: 'A file is required' });
    return;
  }

  const material = await ProgramMaterial.create({
    programId,
    organizationId: req.user.organizationId,
    title,
    description: description || '',
    category: category || 'study_material',
    fileUrl: `/uploads/${file.filename}`,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    semesterNumber: semesterNumber ? Number(semesterNumber) : null,
    uploadedBy: req.user._id,
  });

  await material.populate('uploadedBy', 'name email');

  res.status(201).json({ success: true, data: material });
});

// PUT /api/operations/programs/:programId/materials/:materialId
export const updateProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { materialId } = req.params;
  const { title, description, category, semesterNumber } = req.body;

  const material = await ProgramMaterial.findOne({
    _id: materialId,
    organizationId: req.user.organizationId,
  });

  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  if (title) material.title = title;
  if (description !== undefined) material.description = description;
  if (category) material.category = category;
  if (semesterNumber !== undefined) material.semesterNumber = semesterNumber ? Number(semesterNumber) : undefined;

  // If a new file was uploaded, replace the old one
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[0] || (req as any).file as Express.Multer.File | undefined;
  if (file) {
    material.fileUrl = `/uploads/${file.filename}`;
    material.fileName = file.originalname;
    material.fileSize = file.size;
    material.mimeType = file.mimetype;
  }

  await material.save();
  await material.populate('uploadedBy', 'name email');

  res.status(200).json({ success: true, data: material });
});

// DELETE /api/operations/programs/:programId/materials/:materialId
// Soft-delete
export const deleteProgramMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { materialId } = req.params;

  const material = await ProgramMaterial.findOne({
    _id: materialId,
    organizationId: req.user.organizationId,
  });

  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  material.isActive = false;
  await material.save();

  res.status(200).json({ success: true, data: {} });
});
