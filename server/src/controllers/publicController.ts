import { Request, Response } from 'express';
import StudyCenterInvite from '../models/StudyCenterInvite.js';
import StudyCenter from '../models/StudyCenter.js';
import UniversityAuthFee from '../models/UniversityAuthFee.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { broadcastNotification } from './notificationController.js';

// GET /public/invite/:token
export const validateInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const invite = await StudyCenterInvite.findOne({ token: req.params.token })
    .populate('universityIds', 'name code')
    .populate('programIds', 'name code universityId');

  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite link not found' });
    return;
  }

  if (invite.status === 'used') {
    res.status(409).json({ success: false, message: 'This invite link has already been used' });
    return;
  }

  if (invite.status === 'expired' || invite.expiresAt < new Date()) {
    res.status(410).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  res.status(200).json({ success: true, data: invite });
});

// POST /public/register
export const publicRegister = asyncHandler(async (req: Request, res: Response) => {
  const { token, name, code, address, contact, email, universityIds } = req.body;

  if (!token) {
    res.status(400).json({ success: false, message: 'Invite token is required' });
    return;
  }

  // Validate token
  const invite = await StudyCenterInvite.findOne({ token });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite link not found' });
    return;
  }
  if (invite.status === 'used') {
    res.status(409).json({ success: false, message: 'This invite link has already been used' });
    return;
  }
  if (invite.status === 'expired' || invite.expiresAt < new Date()) {
    res.status(410).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  // Validate required fields
  // universityIds from FormData may be a string (single) or array (multiple)
  const rawUniIds = universityIds;
  const normalizedUniIds: string[] = rawUniIds
    ? (Array.isArray(rawUniIds) ? rawUniIds : [rawUniIds]).filter(Boolean)
    : [];

  const missing: string[] = [];
  if (!name) missing.push('name');
  if (!code) missing.push('code');
  if (!address) missing.push('address');
  if (!contact) missing.push('contact');
  if (!email) missing.push('email');
  if (normalizedUniIds.length === 0) missing.push('universityIds');

  if (missing.length > 0) {
    res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  // Validate selected universities are subset of invite's universities
  const inviteUniIds = invite.universityIds.map((id: any) => id.toString());
  const selectedIds: string[] = normalizedUniIds;
  const invalid = selectedIds.filter(id => !inviteUniIds.includes(id));
  if (invalid.length > 0) {
    res.status(400).json({ success: false, message: 'Selected universities are not part of this invite' });
    return;
  }

  // Check at least one document uploaded
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, message: 'At least one document is required' });
    return;
  }

  // Check code uniqueness within org
  const existing = await StudyCenter.findOne({ organizationId: invite.organizationId, code });
  if (existing) {
    res.status(400).json({ success: false, message: 'Center code already exists in this organisation' });
    return;
  }

  const pendingDocuments = files.map(f => ({ name: f.originalname, url: `/uploads/${f.filename}`, uploadedAt: new Date() }));

  const center = await StudyCenter.create({
    organizationId: invite.organizationId,
    name,
    code,
    address,
    contact,
    email,
    status: 'pending_verification',
    associatedUniversityIds: selectedIds,
    allowedProgramIds: invite.programIds.map((p: any) => p._id || p),
    pendingDocuments,
    referredBy: invite.referredBy,
    inviteToken: token,
    statusHistory: [{ status: 'pending_verification', timestamp: new Date() }],
  });

  // Mark invite as used
  invite.status = 'used';
  invite.usedAt = new Date();
  await invite.save();

  // Create center_admin user immediately (status: inactive until finance approves)
  const crypto = (await import('crypto')).default;
  const plainPassword = crypto.randomBytes(8).toString('hex');
  const loginEmail = email.toLowerCase();

  let centerUser = await User.findOne({ email: loginEmail, role: 'center_admin' });
  if (!centerUser) {
    centerUser = await User.create({
      organizationId: invite.organizationId,
      name,
      email: loginEmail,
      password: plainPassword,
      role: 'center_admin',
      studyCenterId: center._id,
      status: 'inactive',
    });
  }

  // Notify ops admins
  try {
    await broadcastNotification(invite.organizationId.toString(), {
      title: 'New Study Center Pending Verification',
      message: `${name} has submitted registration and is awaiting document review.`,
      type: 'general',
      priority: 'medium',
      link: 'pending-verification',
    });
  } catch (_) { /* non-critical */ }

  res.status(201).json({
    success: true,
    data: {
      _id: center._id,
      name: center.name,
      status: center.status,
      credentials: { email: loginEmail, password: plainPassword },
    },
  });
});

// GET /public/payment-status/:token
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const invite = await StudyCenterInvite.findOne({ token: req.params.token });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite not found' });
    return;
  }

  // Only match center registered with this exact invite token
  const center = await StudyCenter.findOne({ inviteToken: req.params.token })
    .populate('associatedUniversityIds', 'name code');

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found for this token' });
    return;
  }

  // Fetch auth fees for each associated university
  const fees = await UniversityAuthFee.find({
    organizationId: invite.organizationId,
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
      universities,
      totalFee,
    },
  });
});

// POST /public/submit-payment/:token
export const submitPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  const invite = await StudyCenterInvite.findOne({ token: req.params.token });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite not found' });
    return;
  }

  const center = await StudyCenter.findOne({ inviteToken: req.params.token });
  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found for this token' });
    return;
  }

  if (center.status !== 'pending_payment') {
    res.status(400).json({ success: false, message: `Cannot submit payment — center status is "${center.status}"` });
    return;
  }

  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[0];
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
    const financeAdmins = await User.find({
      organizationId: invite.organizationId,
      role: { $in: ['finance_admin', 'finance_sub_admin'] },
      status: 'active',
    });
    for (const _admin of financeAdmins) {
      await broadcastNotification(invite.organizationId.toString(), {
        title: 'Payment Proof Submitted',
        message: `${center.name} has uploaded payment proof and is awaiting finance verification.`,
        type: 'general',
        priority: 'medium',
        link: 'pending-payment',
      });
    }
  } catch (_) { /* non-critical */ }

  res.json({ success: true, message: 'Payment proof submitted successfully' });
});
