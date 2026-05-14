import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Student from '../models/Student.js';
import InternalMark from '../models/InternalMark.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };

  if (req.query.centerId) query.centerId = req.query.centerId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.programId) query.programId = req.query.programId;

  const students = await Student.find(query)
    .populate('centerId', 'name code')
    .populate('programId', 'name code')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: students.length, data: students });
});

export const getStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findById(req.params.id)
    .populate('centerId')
    .populate('programId')
    .populate('sessionId');

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  res.status(200).json({ success: true, data: student });
});

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const student = await Student.create(req.body);
  res.status(201).json({ success: true, data: student });
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  res.status(200).json({ success: true, data: student });
});

export const approveStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  student.status = 'active';
  await student.save();

  res.status(200).json({ success: true, data: student });
});

export const deleteStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await Student.findByIdAndDelete(req.params.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Internal Marks Management
export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.studentId) query.studentId = req.query.studentId;
  if (req.query.subjectId) query.subjectId = req.query.subjectId;
  if (req.query.examType) query.examType = req.query.examType;

  const marks = await InternalMark.find(query)
    .populate('studentId', 'name enrollmentNo')
    .populate('enteredBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: marks.length, data: marks });
});

export const getInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await InternalMark.findById(req.params.id)
    .populate('studentId', 'name enrollmentNo')
    .populate('enteredBy', 'name email');

  if (!mark) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }

  res.status(200).json({ success: true, data: mark });
});

export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.enteredBy = req.user._id;

  const mark = await InternalMark.create(req.body);
  res.status(201).json({ success: true, data: mark });
});

export const updateInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await InternalMark.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!mark) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }

  res.status(200).json({ success: true, data: mark });
});

export const deleteInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mark = await InternalMark.findByIdAndDelete(req.params.id);

  if (!mark) {
    res.status(404).json({ success: false, message: 'Internal mark not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

