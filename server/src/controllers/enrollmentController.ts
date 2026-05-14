import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import Enrollment from '../models/Enrollment.js';
import EnrollmentPayment from '../models/EnrollmentPayment.js';
import StudyCenterWallet from '../models/StudyCenterWallet.js';
import WalletTopUp from '../models/WalletTopUp.js';
import ProgramFeeStructure from '../models/ProgramFeeStructure.js';
import Program from '../models/Program.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.user.studyCenterId || req.user._id;
  const orgId = req.user.organizationId;

  const wallet = await StudyCenterWallet.findOneAndUpdate(
    { studyCenterId: centerId },
    { $setOnInsert: { studyCenterId: centerId, organizationId: orgId, balance: 0 } },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, data: wallet });
});

export const submitTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, paymentMethod, referenceNumber, proofDocument } = req.body;
  const centerId = req.user.studyCenterId || req.user._id;

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, message: 'amount must be greater than zero' });
    return;
  }

  if (paymentMethod === 'offline' && !referenceNumber && !proofDocument) {
    res.status(400).json({ success: false, message: 'referenceNumber or proofDocument is required for offline payments' });
    return;
  }

  const topUp = await WalletTopUp.create({
    studyCenterId: centerId,
    organizationId: req.user.organizationId,
    amount,
    paymentMethod,
    referenceNumber,
    proofDocument,
    status: 'pending',
  });

  res.status(201).json({ success: true, data: topUp });
});

export const getTopUpHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.user.studyCenterId || req.user._id;

  const topUps = await WalletTopUp.find({ studyCenterId: centerId })
    .sort('-createdAt');

  res.status(200).json({ success: true, count: topUps.length, data: topUps });
});

// ─── Programs ─────────────────────────────────────────────────────────────────

export const getEnrollablePrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Only programs that have a ProgramFeeStructure
  const feeStructures = await ProgramFeeStructure.find({ organizationId: req.user.organizationId });
  const programIds = feeStructures.map(f => f.programId);

  const programs = await Program.find({
    _id: { $in: programIds },
    organizationId: req.user.organizationId,
    status: 'active',
  }).populate('universityId', 'name code');

  // Attach fee structure to each program
  const feeMap: Record<string, any> = {};
  feeStructures.forEach(f => { feeMap[f.programId.toString()] = f; });

  const data = programs.map(p => ({
    ...p.toObject(),
    feeStructure: feeMap[p._id.toString()] || null,
  }));

  res.status(200).json({ success: true, count: data.length, data });
});

// ─── Enrollment ───────────────────────────────────────────────────────────────

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentName, studentEmail, studentPhone, studentAddress, programId } = req.body;
  const centerId = req.user.studyCenterId || req.user._id;

  // Validate required fields
  const missing: string[] = [];
  if (!studentName) missing.push('studentName');
  if (!studentEmail) missing.push('studentEmail');
  if (!studentPhone) missing.push('studentPhone');
  if (!studentAddress) missing.push('studentAddress');
  if (!programId) missing.push('programId');
  if (missing.length > 0) {
    res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  // Check fee structure exists
  const feeStructure = await ProgramFeeStructure.findOne({
    programId,
    organizationId: req.user.organizationId,
  });
  if (!feeStructure) {
    res.status(400).json({ success: false, message: 'Program is not yet open for enrollment' });
    return;
  }

  // Calculate total fee
  const totalFee = feeStructure.baseFee + feeStructure.additionalFees.reduce((sum, f) => sum + f.amount, 0);

  // Check wallet balance
  const wallet = await StudyCenterWallet.findOne({ studyCenterId: centerId });
  const balance = wallet?.balance || 0;

  if (balance < totalFee) {
    res.status(400).json({
      success: false,
      message: `Insufficient wallet balance. Required: ${totalFee}, Available: ${balance}`,
    });
    return;
  }

  // Atomic transaction: debit wallet + create enrollment + create payment
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Debit wallet
    const updatedWallet = await StudyCenterWallet.findOneAndUpdate(
      { studyCenterId: centerId, balance: { $gte: totalFee } },
      { $inc: { balance: -totalFee } },
      { new: true, session }
    );

    if (!updatedWallet) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: 'Insufficient wallet balance. Required: ' + totalFee + ', Available: ' + balance });
      return;
    }

    const now = new Date();

    // Create enrollment
    const [enrollment] = await Enrollment.create(
      [{
        studentName,
        studentEmail,
        studentPhone,
        studentAddress,
        programId,
        studyCenterId: centerId,
        organizationId: req.user.organizationId,
        status: 'document_review', // auto-transition after payment
        statusHistory: [
          { status: 'payment_pending', timestamp: now },
          { status: 'document_review', timestamp: now },
        ],
      }],
      { session }
    );

    // Create payment record
    await EnrollmentPayment.create(
      [{
        enrollmentId: enrollment._id,
        studyCenterId: centerId,
        walletId: updatedWallet._id,
        amount: totalFee,
        debitedAt: now,
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Enrollment creation failed:', err);
    res.status(500).json({ success: false, message: 'Enrollment creation failed. Please try again.' });
  }
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const centerId = req.user.studyCenterId || req.user._id;
  const query: any = { studyCenterId: centerId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.programId) query.programId = req.query.programId;

  const enrollments = await Enrollment.find(query)
    .populate('programId', 'name code')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

// ─── Center Onboarding (authenticated) ───────────────────────────────────────

export const getMyCenterStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const StudyCenter = (await import('../models/StudyCenter.js')).default;
  const UniversityAuthFee = (await import('../models/UniversityAuthFee.js')).default;

  const center = await StudyCenter.findById(req.user.studyCenterId)
    .populate('associatedUniversityIds', 'name code');

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  const fees = await UniversityAuthFee.find({
    organizationId: req.user.organizationId,
    universityId: { $in: center.associatedUniversityIds },
  });

  const feeMap: Record<string, number> = {};
  fees.forEach(f => { feeMap[f.universityId.toString()] = f.amount; });

  const universities = (center.associatedUniversityIds as any[]).map(u => ({
    _id: u._id,
    name: u.name,
    code: u.code,
    fee: feeMap[u._id.toString()] ?? null,
  }));

  const totalFee = universities.reduce((sum, u) => sum + (u.fee || 0), 0);

  res.json({
    success: true,
    data: {
      centerId: center._id,
      centerName: center.name,
      status: center.status,
      paymentProof: center.paymentProof || null,
      opsRemarks: center.opsRemarks || null,
      paymentRemarks: center.paymentRemarks || null,
      universities,
      totalFee,
    },
  });
});

export const submitMyCenterPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const StudyCenter = (await import('../models/StudyCenter.js')).default;

  const center = await StudyCenter.findById(req.user.studyCenterId);
  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  if (center.status !== 'pending_payment') {
    res.status(400).json({ success: false, message: `Cannot submit payment — center status is "${center.status}"` });
    return;
  }

  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[0] || (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ success: false, message: 'Payment proof file is required' });
    return;
  }

  center.paymentProof = {
    url: `/uploads/${file.filename}`,
    uploadedAt: new Date(),
    remarks: req.body.remarks || '',
  };
  await center.save();

  // Notify finance admins
  try {
    const { broadcastNotification } = await import('./notificationController.js');
    await broadcastNotification(req.user.organizationId.toString(), {
      title: 'Payment Proof Submitted',
      message: `${center.name} has uploaded payment proof and is awaiting finance verification.`,
      type: 'general',
      priority: 'medium',
      link: 'pending-payment',
    });
  } catch (_) { /* non-critical */ }

  res.json({ success: true, message: 'Payment proof submitted successfully' });
});
