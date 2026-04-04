import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Enrollment, { VALID_TRANSITIONS } from '../models/Enrollment.js';
import EnrollmentPayment from '../models/EnrollmentPayment.js';
import Student from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /finance/enrollments/all — full student data across all statuses
export const getAllEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.programId) query.programId = req.query.programId;
  if (req.query.studyCenterId) query.studyCenterId = req.query.studyCenterId;
  if (req.query.search) {
    const re = new RegExp(req.query.search as string, 'i');
    query.$or = [{ studentName: re }, { studentEmail: re }, { enrollmentNumber: re }];
  }

  const enrollments = await Enrollment.find(query)
    .populate('programId', 'name code')
    .populate('studyCenterId', 'name code')
    .populate('financeReviewedBy', 'name email')
    .populate('departmentReviewedBy', 'name email')
    .sort('-createdAt');

  // Attach payment info
  const ids = enrollments.map(e => e._id);
  const payments = await EnrollmentPayment.find({ enrollmentId: { $in: ids } });
  const paymentMap: Record<string, any> = {};
  payments.forEach(p => { paymentMap[p.enrollmentId.toString()] = p; });

  const data = enrollments.map(e => ({
    ...e.toObject(),
    payment: paymentMap[e._id.toString()] || null,
  }));

  // Status summary counts
  const allStatuses = ['payment_pending', 'document_review', 'finance_review', 'enrolled', 'rejected', 'department_rejected'];
  const summary: Record<string, number> = {};
  for (const s of allStatuses) {
    summary[s] = await Enrollment.countDocuments({ organizationId: req.user.organizationId, status: s });
  }

  res.status(200).json({ success: true, count: data.length, summary, data });
});

export const getFinanceEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = {
    organizationId: req.user.organizationId,
    status: { $in: ['finance_review', 'enrolled', 'rejected'] },
  };
  if (req.query.status) query.status = req.query.status;
  if (req.query.programId) query.programId = req.query.programId;

  const enrollments = await Enrollment.find(query)
    .populate('programId', 'name code')
    .populate('studyCenterId', 'name code')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

export const approveFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await Enrollment.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Enrollment not found' });
    return;
  }

  if (enrollment.status !== 'finance_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to enrolled` });
    return;
  }

  // Verify payment record exists
  const payment = await EnrollmentPayment.findOne({ enrollmentId: enrollment._id });
  if (!payment) {
    res.status(400).json({ success: false, message: 'No payment record found for this enrollment' });
    return;
  }

  const now = new Date();
  enrollment.status = 'enrolled';
  enrollment.financeReviewedBy = req.user._id;
  enrollment.financeReviewedAt = now;
  enrollment.enrolledAt = now;
  enrollment.statusHistory.push({ status: 'enrolled', actorId: req.user._id, timestamp: now });
  await enrollment.save();

  // Activate student record if exists
  try {
    await Student.findOneAndUpdate(
      {
        email: enrollment.studentEmail,
        organizationId: enrollment.organizationId,
      },
      { status: 'active', enrolledAt: now },
      { new: true }
    );
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: enrollment });
});

export const rejectFinanceEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  if (enrollment.status !== 'finance_review') {
    res.status(409).json({ success: false, message: `Cannot transition enrollment from ${enrollment.status} to rejected` });
    return;
  }

  const now = new Date();
  enrollment.status = 'rejected';
  enrollment.financeRemarks = remarks;
  enrollment.financeReviewedBy = req.user._id;
  enrollment.financeReviewedAt = now;
  enrollment.statusHistory.push({ status: 'rejected', actorId: req.user._id, timestamp: now, remarks });
  await enrollment.save();

  res.status(200).json({ success: true, data: enrollment });
});
