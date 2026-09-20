// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import xlsx from 'xlsx';

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

  const isExam = req.body.category === 'exam_objective' || req.body.category === 'exam_subjective' || req.body.category === 'Objective Exam' || req.body.category === 'Subjective Exam';
  const isObjective = req.body.category === 'exam_objective' || req.body.category === 'Objective Exam';

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

  if (isExam && req.file && (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls'))) {
    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);

      let totalMarks = 0;
      const questionsData = rows.map((row: any, index: number) => {
        const questionText = row['Question'] || row['question'] || `Question ${index + 1}`;
        const marks = Number(row['Marks'] || row['marks'] || 1);
        totalMarks += marks;

        if (isObjective) {
            const options = [
                row['Option A'] || row['option a'] || row['Option 1'],
                row['Option B'] || row['option b'] || row['Option 2'],
                row['Option C'] || row['option c'] || row['Option 3'],
                row['Option D'] || row['option d'] || row['Option 4'],
            ].filter(Boolean);

            const correctAnswer = String(row['Correct Answer'] || row['correct answer'] || '');

            return {
                questionText,
                questionType: 'multiple_choice',
                options,
                correctAnswer,
                marks,
                order: index + 1
            };
        } else {
            return {
                questionText,
                questionType: 'descriptive',
                options: [],
                correctAnswer: null,
                marks,
                order: index + 1
            };
        }
      });

      await prisma.exam.create({
        data: {
          materialId: material.id,
          type: isObjective ? 'objective' : 'subjective',
          totalMarks,
          durationMinutes: Number(req.body.durationMinutes || 60),
          questions: {
            create: questionsData
          }
        }
      });
    } catch (error) {
      console.error('Error parsing exam excel:', error);
    }
  }

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
