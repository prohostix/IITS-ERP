import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Enrollment from '../models/Enrollment.js';
import SubDepartment from '../models/SubDepartment.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDeptReviewEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawSubDeptId = req.user.subDepartmentId;
  const userSubDeptId = typeof rawSubDeptId === 'object' && rawSubDeptId?._id
    ? rawSubDeptId._id.toString()
    : rawSubDeptId?.toString?.();
  const userDeptId = req.user.departmentId?._id?.toString?.() || req.user.departmentId?.toString?.() || req.user.departmentId;

  let enrollmentQuery: any = {
    organizationId: req.user.organizationId,
    status: 'document_review',
  };

  if (userSubDeptId) {
    // Sub-dept manager: scope by centers assigned to their sub-dept
    const subDept = await SubDepartment.findById(userSubDeptId).select('assignedCenters assignedPrograms');
    if (subDept) {
      const centerIds = subDept.assignedCenters || [];
      const programIds = subDept.assignedPrograms || [];
      if (centerIds.length > 0 || programIds.length > 0) {
        enrollmentQuery.$or = [];
        if (centerIds.length > 0) enrollmentQuery.$or.push({ studyCenterId: { $in: centerIds } });
        if (programIds.length > 0) enrollmentQuery.$or.push({ programId: { $in: programIds } });
      }
    }
  } else if (userDeptId) {
    // Dept admin: scope by sub-departments under this department
    const subDepts = await SubDepartment.find({ parentDeptId: userDeptId });
    const allCenterIds = subDepts.flatMap(s => s.assignedCenters || []);
    const allProgramIds = subDepts.flatMap(s => s.assignedPrograms || []);
    if (allCenterIds.length > 0 || allProgramIds.length > 0) {
      enrollmentQuery.$or = [];
      if (allCenterIds.length > 0) enrollmentQuery.$or.push({ studyCenterId: { $in: allCenterIds } });
      if (allProgramIds.length > 0) enrollmentQuery.$or.push({ programId: { $in: allProgramIds } });
    }
  }

  const enrollments = await Enrollment.find(enrollmentQuery)
    .populate('programId', 'name code')
    .populate('studyCenterId', 'name code')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await Enrollment.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'document_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to finance_review` });
    return;
  }

  const now = new Date();
  enrollment.status = 'finance_review';
  enrollment.departmentReviewedBy = req.user._id;
  enrollment.departmentReviewedAt = now;
  enrollment.statusHistory.push({ status: 'finance_review', actorId: req.user._id, timestamp: now });
  await enrollment.save();

  res.status(200).json({ success: true, data: enrollment });
});

export const rejectDeptEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;

  if (!remarks || remarks.trim().length === 0) {
    res.status(400).json({ success: false, message: 'remarks is required for rejection' });
    return;
  }

  const enrollment = await Enrollment.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'document_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to department_rejected` });
    return;
  }

  const now = new Date();
  enrollment.status = 'department_rejected';
  enrollment.departmentRemarks = remarks;
  enrollment.departmentReviewedBy = req.user._id;
  enrollment.departmentReviewedAt = now;
  enrollment.statusHistory.push({ status: 'department_rejected', actorId: req.user._id, timestamp: now, remarks });
  await enrollment.save();

  res.status(200).json({ success: true, data: enrollment });
});
