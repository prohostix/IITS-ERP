import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import University from '../models/University.js';
import Program from '../models/Program.js';
import StudyCenter from '../models/StudyCenter.js';
import AdmissionSession from '../models/AdmissionSession.js';
import InternalMark from '../models/InternalMark.js';
import Announcement from '../models/Announcement.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { broadcastNotification } from './notificationController.js';

// Universities
export const getUniversities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;

  // Branch isolation: if the user is a branch manager, only show universities
  // that have no branch restriction OR explicitly include their branch
  const userBranchId = req.user.branchId?._id || req.user.branchId;
  if (userBranchId) {
    query.$or = [
      { allowedBranchIds: { $size: 0 } },
      { allowedBranchIds: userBranchId },
    ];
  }

  const universities = await University.find(query)
    .populate('subDepartmentId', 'name')
    .populate('allowedBranchIds', 'name branchCode');
  res.status(200).json({ success: true, count: universities.length, data: universities });
});

export const createUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  // allowedBranchIds comes from body as-is (array of IDs or empty)
  if (!req.body.allowedBranchIds) req.body.allowedBranchIds = [];

  const university = await University.create(req.body);
  await university.populate('allowedBranchIds', 'name branchCode');
  res.status(201).json({ success: true, data: university });
});

export const updateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('allowedBranchIds', 'name branchCode');

  if (!university) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }

  res.status(200).json({ success: true, data: university });
});

// Programs
export const getPrograms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.universityId) query.universityId = req.query.universityId;

  const programs = await Program.find(query)
    .populate('universityId', 'name code')
    .populate('subDepartmentId', 'name parentDeptId');
  res.status(200).json({ success: true, count: programs.length, data: programs });
});

export const createProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const program = await Program.create(req.body);
  res.status(201).json({ success: true, data: program });
});

export const updateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await Program.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({ success: true, data: program });
});

// Study Centers
export const getStudyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;

  const centers = await StudyCenter.find(query).populate('referredBy', 'name email');
  res.status(200).json({ success: true, count: centers.length, data: centers });
});

export const createStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  // Sales roles: center starts as pending and is linked to the creator
  const isSales = ['sales_admin', 'bde', 'employee'].includes(req.user.role);
  if (isSales) {
    req.body.status = 'pending_verification';
    req.body.referredBy = req.user._id;
  }

  const center = await StudyCenter.create(req.body);
  res.status(201).json({ success: true, data: center });
});

export const updateStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  res.status(200).json({ success: true, data: center });
});

export const approveStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findById(req.params.id);

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  center.status = 'active';
  center.financeApprovedBy = req.user._id;
  center.financeApprovedAt = new Date();
  await center.save();

  res.status(200).json({ success: true, data: center });
});

// Admission Sessions
export const getAdmissionSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;

  const sessions = await AdmissionSession.find(query).populate('subDepartmentId', 'name');
  res.status(200).json({ success: true, count: sessions.length, data: sessions });
});

export const createAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const session = await AdmissionSession.create(req.body);
  res.status(201).json({ success: true, data: session });
});

export const approveAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await AdmissionSession.findById(req.params.id);

  if (!session) {
    res.status(404).json({ success: false, message: 'Admission session not found' });
    return;
  }

  session.status = 'approved';
  session.approvedBy = req.user._id;
  session.approvedAt = new Date();
  await session.save();

  res.status(200).json({ success: true, data: session });
});

// Internal Marks
export const getInternalMarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.studentId) query.studentId = req.query.studentId;

  // Study center admins only see marks they entered (for their center's students)
  if (req.user.role === 'center_admin') {
    const center = await StudyCenter.findOne({ organizationId: req.user.organizationId, referredBy: req.user._id });
    if (center) query.studyCenterId = center._id;
    else query.enteredBy = req.user._id; // fallback: marks they personally entered
  }

  const marks = await InternalMark.find(query)
    .populate('studentId', 'name enrollmentNo')
    .populate('enteredBy', 'name email')
    .populate('studyCenterId', 'name code');

  res.status(200).json({ success: true, count: marks.length, data: marks });
});

export const createInternalMark = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.enteredBy = req.user._id;

  // Auto-attach studyCenterId for center_admin
  if (req.user.role === 'center_admin') {
    const center = await StudyCenter.findOne({ organizationId: req.user.organizationId, referredBy: req.user._id });
    if (!center) {
      res.status(403).json({ success: false, message: 'No study center found for your account' });
      return;
    }
    req.body.studyCenterId = center._id;
  }

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

// Announcements
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.type) query.type = req.query.type;

  const announcements = await Announcement.find(query)
    .populate('postedBy', 'name email')
    .sort('-postedAt');

  res.status(200).json({ success: true, count: announcements.length, data: announcements });
});

export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.postedBy = req.user._id;

  const announcement = await Announcement.create(req.body);

  // Broadcast real-time notification to all org users
  await broadcastNotification(req.user.organizationId.toString(), {
    title: announcement.title,
    message: announcement.content.substring(0, 120),
    type: 'announcement',
    priority: announcement.priority,
    link: 'announcements',
  });

  res.status(201).json({ success: true, data: announcement });
});


// Get single university
export const getUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.findById(req.params.id)
    .populate('allowedBranchIds', 'name branchCode');

  if (!university) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }

  res.status(200).json({ success: true, data: university });
});

// Delete university
export const deleteUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.findByIdAndDelete(req.params.id);

  if (!university) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Activate university
export const activateUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.findByIdAndUpdate(
    req.params.id,
    { status: 'active' },
    { new: true }
  );

  if (!university) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }

  res.status(200).json({ success: true, data: university });
});

// Get single program
export const getProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await Program.findById(req.params.id).populate('universityId', 'name code');

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({ success: true, data: program });
});

// Delete program
export const deleteProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await Program.findByIdAndDelete(req.params.id);

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Activate program
export const activateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const program = await Program.findByIdAndUpdate(
    req.params.id,
    { status: 'active' },
    { new: true }
  );

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({ success: true, data: program });
});

// Get single study center
export const getStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findById(req.params.id);

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  res.status(200).json({ success: true, data: center });
});

// Delete study center
export const deleteStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findByIdAndDelete(req.params.id);

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Suspend study center
export const suspendStudyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findByIdAndUpdate(
    req.params.id,
    { status: 'suspended' },
    { new: true }
  );

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  res.status(200).json({ success: true, data: center });
});

// Get single admission session
export const getAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await AdmissionSession.findById(req.params.id);

  if (!session) {
    res.status(404).json({ success: false, message: 'Admission session not found' });
    return;
  }

  res.status(200).json({ success: true, data: session });
});

// Update admission session
export const updateAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await AdmissionSession.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!session) {
    res.status(404).json({ success: false, message: 'Admission session not found' });
    return;
  }

  res.status(200).json({ success: true, data: session });
});

// Delete admission session
export const deleteAdmissionSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await AdmissionSession.findByIdAndDelete(req.params.id);

  if (!session) {
    res.status(404).json({ success: false, message: 'Admission session not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Get single announcement
export const getAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
    return;
  }

  res.status(200).json({ success: true, data: announcement });
});

// Update announcement
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!announcement) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
    return;
  }

  res.status(200).json({ success: true, data: announcement });
});

// Delete announcement
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);

  if (!announcement) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// ─── Study Center Onboarding — Ops ───────────────────────────────────────────

import ProgramAllocation from '../models/ProgramAllocation.js';
import { VALID_ONBOARDING_TRANSITIONS } from '../models/StudyCenter.js';

export const getPendingVerificationCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = {
    organizationId: req.user.organizationId,
    status: 'pending_verification',
  };

  // Scope to sub-dept assigned centers for employee sub-dept managers
  const rawSubDeptId = (req.user as any).subDepartmentId;
  if (rawSubDeptId) {
    const subDeptId = typeof rawSubDeptId === 'object' && rawSubDeptId._id
      ? rawSubDeptId._id
      : rawSubDeptId;
    const SubDepartment = (await import('../models/SubDepartment.js')).default;
    const subDept = await SubDepartment.findById(subDeptId).select('assignedCenters');
    if (subDept?.assignedCenters?.length) {
      query._id = { $in: subDept.assignedCenters };
    }
  }

  const centers = await StudyCenter.find(query)
    .populate('associatedUniversityIds', 'name code subDepartmentId')
    .populate('referredBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: centers.length, data: centers });
});

export const verifyCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;
  const center = await StudyCenter.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  if (center.status !== 'pending_verification') {
    res.status(400).json({ success: false, message: 'Action not permitted at current stage' });
    return;
  }

  if (action === 'approve') {
    center.status = 'pending_payment';
    center.verifiedBy = req.user._id;
    center.verifiedAt = new Date();
    center.statusHistory.push({ status: 'pending_payment', actorId: req.user._id, remarks, timestamp: new Date() });

    // Notify finance admins
    try {
      await broadcastNotification(req.user.organizationId.toString(), {
        title: 'Study Center Pending Payment Verification',
        message: `${center.name} has been approved by Ops and is awaiting finance verification.`,
        type: 'general',
        priority: 'medium',
        link: 'pending-payment',
      });
    } catch (_) { /* non-critical */ }
  } else if (action === 'reject') {
    if (!remarks || remarks.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Remarks are required when rejecting' });
      return;
    }
    center.status = 'rejected';
    center.opsRemarks = remarks;
    center.statusHistory.push({ status: 'rejected', actorId: req.user._id, remarks, timestamp: new Date() });
  } else {
    res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject' });
    return;
  }

  await center.save();
  res.status(200).json({ success: true, data: center });
});

export const getProgramAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocations = await ProgramAllocation.find({
    organizationId: req.user.organizationId,
    studyCenterId: req.params.id,
    isActive: true,
  }).populate('programId', 'name code courseType');

  res.status(200).json({ success: true, count: allocations.length, data: allocations });
});

export const allocateProgram = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await StudyCenter.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  if (center.status !== 'active') {
    res.status(400).json({ success: false, message: 'Center must be active before programs can be allocated' });
    return;
  }

  const { programId } = req.body;
  if (!programId) {
    res.status(400).json({ success: false, message: 'programId is required' });
    return;
  }

  // Check for existing active allocation
  const existing = await ProgramAllocation.findOne({
    organizationId: req.user.organizationId,
    studyCenterId: req.params.id,
    programId,
  });

  if (existing) {
    if (existing.isActive) {
      res.status(400).json({ success: false, message: 'Program is already allocated to this center' });
      return;
    }
    // Re-activate soft-deleted allocation
    existing.isActive = true;
    existing.allocatedBy = req.user._id;
    existing.allocatedAt = new Date();
    await existing.save();
    res.status(200).json({ success: true, data: existing });
    return;
  }

  const allocation = await ProgramAllocation.create({
    organizationId: req.user.organizationId,
    studyCenterId: req.params.id,
    programId,
    allocatedBy: req.user._id,
    allocatedAt: new Date(),
  });

  res.status(201).json({ success: true, data: allocation });
});

export const removeAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const allocation = await ProgramAllocation.findOne({
    _id: req.params.allocId,
    organizationId: req.user.organizationId,
    studyCenterId: req.params.id,
  });

  if (!allocation) {
    res.status(404).json({ success: false, message: 'Allocation not found' });
    return;
  }

  allocation.isActive = false;
  await allocation.save();

  res.status(200).json({ success: true, data: {} });
});
