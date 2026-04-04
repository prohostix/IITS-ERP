import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Lead from '../models/Lead.js';
import Target from '../models/Target.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { broadcastNotification, notifyUser } from './notificationController.js';

export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.referredBy) query.referredBy = req.query.referredBy;

  const leads = await Lead.find(query)
    .populate('referredBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: leads.length, data: leads });
});

export const getLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await Lead.findById(req.params.id).populate('referredBy', 'name email');

  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  res.status(200).json({ success: true, data: lead });
});

export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const lead = await Lead.create(req.body);
  res.status(201).json({ success: true, data: lead });
});

export const updateLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  // Notify on status changes worth tracking
  if (req.body.status && ['converted', 'lost'].includes(req.body.status)) {
    try {
      const orgId = req.user.organizationId.toString();
      const isWon = req.body.status === 'converted';
      await broadcastNotification(orgId, {
        title: isWon ? 'Lead Won' : 'Lead Lost',
        message: `${req.user.name} marked lead "${lead.centerName || lead.contactName || ''}" as ${req.body.status}.`,
        type: 'general',
        priority: isWon ? 'high' : 'medium',
        link: 'leads',
        roles: ['sales_admin', 'org_admin', 'ceo'],
      });
    } catch (_) { /* non-critical */ }
  }

  res.status(200).json({ success: true, data: lead });
});

export const convertLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  lead.status = 'converted';
  lead.convertedAt = new Date();
  await lead.save();

  // Notify the sales person's manager (reportingTo) and org admins
  try {
    const orgId = req.user.organizationId.toString();
    const User = (await import('../models/User.js')).default;
    const actor = await User.findById(req.user._id).select('reportingTo name');

    // Notify direct manager
    if (actor?.reportingTo) {
      await notifyUser(actor.reportingTo.toString(), orgId, {
        title: 'Lead Converted',
        message: `${req.user.name} converted lead "${lead.centerName || lead.contactName || 'a lead'}" to a sale.`,
        type: 'general',
        priority: 'high',
        link: 'leads',
      });
    }

    // Notify sales_admin / org_admin
    await broadcastNotification(orgId, {
      title: 'Lead Converted',
      message: `${req.user.name} closed a deal — lead "${lead.centerName || lead.contactName || ''}" converted.`,
      type: 'general',
      priority: 'high',
      link: 'leads',
      roles: ['sales_admin', 'org_admin', 'ceo'],
    });
  } catch (_) { /* non-critical */ }

  res.status(200).json({ success: true, data: lead });
});

export const deleteLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);

  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Target Management
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.departmentId) query.departmentId = req.query.departmentId;
  if (req.query.employeeId) query.employeeId = req.query.employeeId;
  if (req.query.centerId) query.centerId = req.query.centerId;
  if (req.query.type) query.type = req.query.type;
  if (req.query.period) query.period = req.query.period;

  const targets = await Target.find(query)
    .populate('departmentId', 'name')
    .populate('employeeId', 'name email')
    .populate('centerId', 'name code')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: targets.length, data: targets });
});

export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findById(req.params.id)
    .populate('departmentId', 'name')
    .populate('employeeId', 'name email')
    .populate('centerId', 'name code');

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: target });
});

export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const target = await Target.create(req.body);
  res.status(201).json({ success: true, data: target });
});

export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: target });
});

export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await Target.findByIdAndDelete(req.params.id);

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});


// ─── Study Center Invite ──────────────────────────────────────────────────────

import StudyCenterInvite, { generateInviteToken } from '../models/StudyCenterInvite.js';
import University from '../models/University.js';
import Program from '../models/Program.js';

export const getProgramsByUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const raw = req.query.universityIds as string;
  if (!raw) {
    res.status(400).json({ success: false, message: 'universityIds query param required' });
    return;
  }
  const ids = raw.split(',').filter(Boolean);
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const programs = await Program.find({
    organizationId: orgId,
    universityId: { $in: ids },
    status: 'active',
  }).select('name code universityId courseType duration').lean();

  res.json({ success: true, data: programs });
});

export const generateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityIds, programIds } = req.body;

  if (!universityIds || !Array.isArray(universityIds) || universityIds.length === 0) {
    res.status(400).json({ success: false, message: 'At least one university is required' });
    return;
  }

  const userBranchId = (req.user as any).branchId?._id || (req.user as any).branchId;

  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  // Validate universities belong to this org
  const uniQuery: any = {
    _id: { $in: universityIds },
    organizationId: orgId,
  };
  if (userBranchId) {
    uniQuery.$or = [
      { allowedBranchIds: { $size: 0 } },
      { allowedBranchIds: userBranchId },
    ];
  }

  const universities = await University.find(uniQuery);

  if (universities.length !== universityIds.length) {
    res.status(403).json({ success: false, message: 'One or more universities are not accessible' });
    return;
  }

  // Validate programs belong to selected universities in this org
  const normalizedProgramIds: string[] = Array.isArray(programIds) ? programIds : [];
  if (normalizedProgramIds.length > 0) {
    const Program = (await import('../models/Program.js')).default;
    const programs = await Program.find({
      _id: { $in: normalizedProgramIds },
      organizationId: orgId,
      universityId: { $in: universityIds },
      status: 'active',
    });
    if (programs.length !== normalizedProgramIds.length) {
      res.status(400).json({ success: false, message: 'One or more programs are invalid or not linked to selected universities' });
      return;
    }
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await StudyCenterInvite.create({
    organizationId: orgId,
    token,
    universityIds,
    programIds: normalizedProgramIds,
    referredBy: req.user._id,
    ...(userBranchId && { branchId: userBranchId }),
    expiresAt,
  });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5194';
  res.status(201).json({
    success: true,
    data: {
      ...invite.toObject(),
      inviteUrl: `${clientUrl}/register?token=${token}`,
    },
  });
});

export const listMyInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const invites = await StudyCenterInvite.find({
    organizationId: orgId,
    referredBy: req.user._id,
  })
    .populate('universityIds', 'name code')
    .populate('programIds', 'name code universityId')
    .sort('-createdAt');

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5194';
  const enriched = invites.map(inv => ({
    ...inv.toObject(),
    inviteUrl: `${clientUrl}/register?token=${inv.token}`,
  }));

  res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

export const regenerateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const invite = await StudyCenterInvite.findOne({
    _id: req.params.id,
    organizationId: orgId,
    referredBy: req.user._id,
  });

  if (!invite) {
    res.status(404).json({ success: false, message: 'Invite not found' });
    return;
  }

  // Generate a fresh token and reset status
  invite.token = generateInviteToken();
  invite.status = 'pending';
  invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Use updateOne to properly $unset usedAt
  await StudyCenterInvite.updateOne(
    { _id: invite._id },
    {
      $set: { token: invite.token, status: 'pending', expiresAt: invite.expiresAt },
      $unset: { usedAt: '' },
    }
  );

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5194';
  res.status(200).json({
    success: true,
    data: {
      ...invite.toObject(),
      inviteUrl: `${clientUrl}/register?token=${invite.token}`,
    },
  });
});

// ─── Team Performance ─────────────────────────────────────────────────────────
import User from '../models/User.js';

export const getTeamPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const deptId = (req.user as any).departmentId;
  const subDeptId = (req.user as any).subDepartmentId;
  const additionalDeptIds: any[] = (req.user as any).additionalDepartmentIds || [];
  const branchId = (req.user as any).branchId?._id || (req.user as any).branchId;

  // Find teammates: branch managers see everyone in their branch depts
  const userQuery: any = { organizationId: orgId, _id: { $ne: req.user._id } };

  if (branchId) {
    // Branch manager: find all users in any of the branch's departments
    const allDeptIds = additionalDeptIds.map((d: any) => d._id || d);
    if (deptId) allDeptIds.push(typeof deptId === 'object' ? deptId._id || deptId : deptId);
    userQuery.$or = [
      { departmentId: { $in: allDeptIds } },
      { additionalDepartmentIds: { $in: allDeptIds } },
    ];
  } else if (subDeptId) {
    userQuery.subDepartmentId = subDeptId;
  } else if (deptId) {
    userQuery.departmentId = typeof deptId === 'object' ? deptId._id || deptId : deptId;
  }

  const teammates = await User.find(userQuery).select('name designation role status avatar').lean();

  if (!teammates.length) {
    return res.status(200).json({ success: true, data: [] });
  }

  const teammateIds = teammates.map((t: any) => t._id);

  // Aggregate leads per user
  const leadAgg = await Lead.aggregate([
    { $match: { organizationId: orgId, referredBy: { $in: teammateIds } } },
    { $group: {
      _id: '$referredBy',
      total: { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
    }},
  ]);

  // Aggregate targets per user
  const targetAgg = await Target.aggregate([
    { $match: { organizationId: orgId, employeeId: { $in: teammateIds } } },
    { $group: {
      _id: '$employeeId',
      totalTarget: { $sum: '$target' },
      totalAchieved: { $sum: '$achieved' },
      count: { $sum: 1 },
    }},
  ]);

  const leadMap: Record<string, any> = {};
  leadAgg.forEach((l: any) => { leadMap[l._id.toString()] = l; });

  const targetMap: Record<string, any> = {};
  targetAgg.forEach((t: any) => { targetMap[t._id.toString()] = t; });

  const data = teammates.map((t: any) => {
    const id = t._id.toString();
    const leads = leadMap[id] || { total: 0, converted: 0 };
    const targets = targetMap[id] || { totalTarget: 0, totalAchieved: 0, count: 0 };
    const convRate = leads.total > 0 ? Math.round((leads.converted / leads.total) * 100) : 0;
    const targetPct = targets.totalTarget > 0 ? Math.round((targets.totalAchieved / targets.totalTarget) * 100) : 0;
    return {
      _id: id,
      name: t.name,
      designation: t.designation || t.role,
      status: t.status,
      leads: leads.total,
      converted: leads.converted,
      conversionRate: convRate,
      targetCount: targets.count,
      targetAchieved: targets.totalAchieved,
      targetTotal: targets.totalTarget,
      targetProgress: targetPct,
      // Simple performance score: weighted avg of conversion rate + target progress
      score: Math.round((convRate * 0.5) + (targetPct * 0.5)),
    };
  });

  // Sort by score desc
  data.sort((a: any, b: any) => b.score - a.score);

  res.status(200).json({ success: true, data });
});

// ─── My Study Centers (via invite links — self + subordinates) ────────────────
import StudyCenter from '../models/StudyCenter.js';
import Enrollment from '../models/Enrollment.js';

export const getMyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const deptId = (req.user as any).departmentId;
  const subDeptId = (req.user as any).subDepartmentId;
  const additionalDeptIds: any[] = (req.user as any).additionalDepartmentIds || [];
  const branchId = (req.user as any).branchId?._id || (req.user as any).branchId;

  const subQuery: any = { organizationId: orgId, _id: { $ne: req.user._id } };
  if (branchId) {
    const allDeptIds = additionalDeptIds.map((d: any) => d._id || d);
    if (deptId) allDeptIds.push(typeof deptId === 'object' ? deptId._id || deptId : deptId);
    subQuery.$or = [
      { departmentId: { $in: allDeptIds } },
      { additionalDepartmentIds: { $in: allDeptIds } },
    ];
  } else if (subDeptId) {
    subQuery.subDepartmentId = subDeptId;
  } else if (deptId) {
    subQuery.departmentId = typeof deptId === 'object' ? (deptId as any)._id || deptId : deptId;
  }
  const subordinates = await User.find(subQuery).select('_id').lean();
  const referrerIds = [req.user._id, ...subordinates.map((u: any) => u._id)];

  // Find all invites by these referrers
  const invites = await StudyCenterInvite.find({
    organizationId: orgId,
    referredBy: { $in: referrerIds },
  }).select('token referredBy').lean();

  const tokens = invites.map((i: any) => i.token);

  if (!tokens.length) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  // Find centers that used these tokens
  const centers = await StudyCenter.find({
    organizationId: orgId,
    inviteToken: { $in: tokens },
  })
    .populate('referredBy', 'name email')
    .populate('associatedUniversityIds', 'name code')
    .populate('verifiedBy', 'name email')
    .populate('financeApprovedBy', 'name email')
    .sort('-createdAt')
    .lean();

  // Attach referrer name from invite map
  const inviteMap: Record<string, any> = {};
  invites.forEach((i: any) => { inviteMap[i.token] = i; });

  const enriched = centers.map((c: any) => ({
    ...c,
    _referredByInvite: inviteMap[c.inviteToken] || null,
  }));

  res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

export const getMyCenterAdmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const deptId = (req.user as any).departmentId;
  const subDeptId = (req.user as any).subDepartmentId;
  const additionalDeptIds: any[] = (req.user as any).additionalDepartmentIds || [];
  const branchId = (req.user as any).branchId?._id || (req.user as any).branchId;

  const subQuery: any = { organizationId: orgId, _id: { $ne: req.user._id } };
  if (branchId) {
    const allDeptIds = additionalDeptIds.map((d: any) => d._id || d);
    if (deptId) allDeptIds.push(typeof deptId === 'object' ? deptId._id || deptId : deptId);
    subQuery.$or = [
      { departmentId: { $in: allDeptIds } },
      { additionalDepartmentIds: { $in: allDeptIds } },
    ];
  } else if (subDeptId) {
    subQuery.subDepartmentId = subDeptId;
  } else if (deptId) {
    subQuery.departmentId = typeof deptId === 'object' ? (deptId as any)._id || deptId : deptId;
  }
  const subordinates = await User.find(subQuery).select('_id').lean();
  const referrerIds = [req.user._id, ...subordinates.map((u: any) => u._id)];

  const invites = await StudyCenterInvite.find({
    organizationId: orgId,
    referredBy: { $in: referrerIds },
  }).select('token').lean();

  const tokens = invites.map((i: any) => i.token);

  if (!tokens.length) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const centers = await StudyCenter.find({
    organizationId: orgId,
    inviteToken: { $in: tokens },
  }).select('_id name code').lean();

  const centerIds = centers.map((c: any) => c._id);

  if (!centerIds.length) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const enrollments = await Enrollment.find({
    organizationId: orgId,
    studyCenterId: { $in: centerIds },
  })
    .populate('studyCenterId', 'name code')
    .populate('programId', 'name code')
    .sort('-createdAt')
    .lean();

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

export const getMyCenterDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const mongoose = (await import('mongoose')).default;
  const orgId = typeof req.user.organizationId === 'object'
    ? (req.user.organizationId as any)._id
    : req.user.organizationId;

  const { centerId } = req.params;
  const centerObjId = new mongoose.Types.ObjectId(centerId);
  const orgObjId = new mongoose.Types.ObjectId(orgId.toString());

  const center = await StudyCenter.findOne({ _id: centerObjId, organizationId: orgObjId })
    .populate('associatedUniversityIds', 'name code country')
    .populate('allowedProgramIds', 'name code duration level')
    .populate('referredBy', 'name email')
    .lean();

  if (!center) {
    res.status(404);
    throw new Error('Center not found');
  }

  // Get all enrollments for this center
  const enrollments = await Enrollment.find({
    organizationId: orgObjId,
    studyCenterId: centerObjId,
  })
    .populate('programId', 'name code duration level')
    .sort('-createdAt')
    .lean();

  // Group enrollments by program
  const byProgram: Record<string, { program: any; students: any[] }> = {};
  for (const e of enrollments) {
    const prog = e.programId as any;
    const key = prog?._id?.toString() || 'unknown';
    if (!byProgram[key]) byProgram[key] = { program: prog, students: [] };
    byProgram[key].students.push(e);
  }

  // Monthly breakdown (last 12 months)
  const monthlyMap: Record<string, { month: string; total: number; enrolled: number; pending: number; rejected: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyMap[key] = { month: label, total: 0, enrolled: 0, pending: 0, rejected: 0 };
  }
  for (const e of enrollments) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) continue;
    monthlyMap[key].total++;
    if (e.status === 'enrolled') monthlyMap[key].enrolled++;
    else if (['payment_pending', 'document_review', 'finance_review'].includes(e.status)) monthlyMap[key].pending++;
    else if (['rejected', 'department_rejected'].includes(e.status)) monthlyMap[key].rejected++;
  }

  // Stats
  const stats = {
    totalStudents: enrollments.length,
    enrolled: enrollments.filter(e => e.status === 'enrolled').length,
    pending: enrollments.filter(e => ['payment_pending', 'document_review', 'finance_review'].includes(e.status)).length,
    rejected: enrollments.filter(e => ['rejected', 'department_rejected'].includes(e.status)).length,
  };

  res.status(200).json({
    success: true,
    data: {
      center,
      enrollments,
      byProgram: Object.values(byProgram),
      monthly: Object.values(monthlyMap),
      stats,
    },
  });
});
