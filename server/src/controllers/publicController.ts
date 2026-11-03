// @ts-nocheck
import { Response, Request } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';

export const validateInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const invite = await prisma.studyCenterInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
      referrer: { select: { id: true, name: true, email: true } }
    }
  });

  if (!invite) {
    res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    return;
  }

  if (invite.status === 'expired' || (invite.expiresAt && new Date(invite.expiresAt) < new Date())) {
    res.status(410).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  // Check if this invite was already used
  const existingCenter = await prisma.studyCenter.findFirst({
    where: { organizationId: invite.organizationId, inviteToken: token }
  });
  if (existingCenter && invite.status === 'used') {
    res.status(409).json({ success: false, message: 'This invite link has already been used for registration' });
    return;
  }

  // Hydrate university objects for the UI
  let universities = [];
  if (Array.isArray(invite.universityIds) && invite.universityIds.length > 0) {
    universities = await prisma.university.findMany({
      where: { id: { in: invite.universityIds }, status: 'active' as any },
      select: { id: true, name: true, code: true }
    });
  } else {
    // If no specific universities restricted, allow all active universities in org
    universities = await prisma.university.findMany({
      where: { organizationId: invite.organizationId, status: 'active' as any },
      select: { id: true, name: true, code: true }
    });
  }

  // Hydrate program objects for the UI
  let programs = [];
  if (Array.isArray(invite.programIds) && invite.programIds.length > 0) {
    programs = await prisma.program.findMany({
      where: { id: { in: invite.programIds }, status: 'active' as any },
      select: { id: true, name: true, code: true, universityId: true, courseType: true }
    });
  }

  res.json({
    success: true,
    data: {
      id: invite.id,
      token: invite.token,
      organizationId: invite.organizationId,
      referredBy: invite.referredBy,
      expiresAt: invite.expiresAt,
      universityIds: universities, // Array of { id, name, code } objects as expected by PublicRegisterPage
      programIds: programs
    }
  });
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const invite = await prisma.studyCenterInvite.findUnique({ where: { token } });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite token not found' });
    return;
  }

  // Look for a study center registered with this invite token
  const center = await prisma.studyCenter.findFirst({
    where: {
      organizationId: invite.organizationId,
      inviteToken: token
    }
  });

  // If no center has registered yet, return 404 so PublicRegisterPage renders the registration form!
  if (!center) {
    res.status(404).json({ success: false, message: 'No center registered for this invite link yet' });
    return;
  }

  // Hydrate universities with auth fee info
  const universities = await prisma.university.findMany({
    where: { id: { in: center.universityIds || [] } },
    select: { id: true, name: true, code: true }
  });

  const authFees = await prisma.universityAuthFee.findMany({
    where: {
      universityId: { in: center.universityIds || [] },
      organizationId: invite.organizationId
    }
  });

  const uniWithFees = universities.map(u => {
    const feeEntry = authFees.find(f => f.universityId === u.id);
    const amount = feeEntry ? (feeEntry.feeDetails as any)?.amount || 0 : 0;
    return { ...u, fee: amount };
  });

  const totalFee = uniWithFees.reduce((sum, u) => sum + (u.fee || 0), 0);

  res.json({
    success: true,
    data: {
      centerId: center.id,
      centerName: center.name,
      status: center.status,
      paymentProof: center.paymentProof,
      universities: uniWithFees,
      totalFee
    }
  });
});

export const publicRegister = asyncHandler(async (req: Request, res: Response) => {
  const { token, name, code, address, contact, email } = req.body;
  let universityIds = req.body.universityIds;

  if (!token) {
    res.status(400).json({ success: false, message: 'Invite token is required' });
    return;
  }

  const invite = await prisma.studyCenterInvite.findUnique({ where: { token } });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invalid invite link' });
    return;
  }

  if (invite.status === 'expired' || (invite.expiresAt && new Date(invite.expiresAt) < new Date())) {
    res.status(410).json({ success: false, message: 'This invite link has expired' });
    return;
  }

  if (!name || !email) {
    res.status(400).json({ success: false, message: 'Center name and email are required' });
    return;
  }

  // Handle universityIds format (can be string or array from FormData)
  let selectedUnis: string[] = [];
  if (Array.isArray(universityIds)) {
    selectedUnis = universityIds;
  } else if (typeof universityIds === 'string') {
    selectedUnis = [universityIds];
  } else if (Array.isArray(invite.universityIds) && invite.universityIds.length > 0) {
    selectedUnis = invite.universityIds;
  }

  // Determine or generate unique center code
  let centerCode = (code || '').trim().toUpperCase();
  if (!centerCode) {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `SC${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = await prisma.studyCenter.findFirst({
        where: { organizationId: invite.organizationId, code: candidate }
      });
      if (!exists) {
        centerCode = candidate;
        break;
      }
      attempts++;
    }
  } else {
    const existingCenterCode = await prisma.studyCenter.findFirst({
      where: { organizationId: invite.organizationId, code: centerCode }
    });
    if (existingCenterCode) {
      res.status(400).json({
        success: false,
        message: `Center code "${centerCode}" is already in use. Please enter a different code.`
      });
      return;
    }
  }

  // Check email collision
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400).json({ success: false, message: 'A user account with this email already exists' });
    return;
  }

  // Process uploaded documents
  const files = (req.files as Express.Multer.File[]) || [];
  const documents = files.map(f => ({
    name: f.originalname,
    filename: f.filename,
    path: `/uploads/${f.filename}`,
    size: f.size,
    uploadedAt: new Date()
  }));

  const rawPassword = `Center@${Math.floor(1000 + Math.random() * 9000)}`;
  const hashedPassword = await hashPassword(rawPassword);
  const userId = await generateUserId();

  const centerWithCreds = await prisma.$transaction(async (tx) => {
    const sc = await tx.studyCenter.create({
      data: {
        organizationId: invite.organizationId,
        name,
        code: centerCode,
        address: address || null,
        contact: contact || 'Not Provided',
        email,
        status: 'pending_verification',
        universityIds: selectedUnis,
        programIds: invite.programIds || [],
        referredBy: invite.referredBy,
        inviteToken: token,
        pendingDocuments: documents,
        credentials: { userId, password: rawPassword }
      }
    });

    // Create center_admin user
    await tx.user.create({
      data: {
        userId,
        email,
        password: hashedPassword,
        name: `${name} Admin`,
        role: 'center_admin',
        organizationId: invite.organizationId,
        studyCenterId: sc.id,
        phone: contact,
        status: 'active' as any
      }
    });

    // Mark invite as used
    await tx.studyCenterInvite.update({
      where: { id: invite.id },
      data: { status: 'used', usedAt: new Date() }
    });

    return sc;
  });

  res.status(201).json({
    success: true,
    data: {
      ...centerWithCreds,
      credentials: { email, password: rawPassword, userId }
    }
  });
});

export const submitPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { remarks } = req.body;

  const invite = await prisma.studyCenterInvite.findUnique({ where: { token } });
  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite token not found' });
    return;
  }

  const center = await prisma.studyCenter.findFirst({
    where: { organizationId: invite.organizationId, inviteToken: token }
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Center not found for this invite' });
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const file = files[0] || (req as any).file;

  const paymentProof = {
    url: file ? `/uploads/${file.filename}` : '',
    filename: file?.originalname || 'payment_proof',
    remarks: remarks || '',
    uploadedAt: new Date()
  };

  await prisma.studyCenter.update({
    where: { id: center.id },
    data: {
      paymentProof,
      paymentRemarks: remarks || null
    }
  });

  res.json({ success: true, message: 'Payment proof submitted successfully' });
});

export const getPublicUniversities = asyncHandler(async (req: Request, res: Response) => {
  const universities = await prisma.university.findMany({ where: { status: 'active' as any } });
  res.json({ success: true, count: universities.length, data: universities });
});

export const getPublicPrograms = asyncHandler(async (req: Request, res: Response) => {
  const programs = await prisma.program.findMany({ where: { status: 'active' as any }, include: { university: true } });
  res.json({ success: true, count: programs.length, data: programs });
});
