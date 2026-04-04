import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Vacancy from '../models/Vacancy.js';
import Complaint from '../models/Complaint.js';
import Holiday from '../models/Holiday.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToUser, emitToRole } from '../config/socket.js';

// ─── Helper: persist + emit a notification ────────────────────────────────────
async function sendNotification(
  recipientId: string,
  organizationId: string,
  title: string,
  message: string,
  type: 'leave' | 'general' = 'leave',
  priority: 'low' | 'medium' | 'high' = 'medium'
) {
  const notif = await Notification.create({
    organizationId,
    userId: recipientId,
    title,
    message,
    type,
    priority,
    read: false,
  });
  emitToUser(recipientId, 'notification', {
    _id: notif._id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    priority: notif.priority,
    read: false,
    createdAt: notif.createdAt,
  });
}

// Leave Requests
export const getLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = typeof req.user.organizationId === 'object' && req.user.organizationId !== null
    ? (req.user.organizationId as any)._id ?? req.user.organizationId
    : req.user.organizationId;

  const query: any = { organizationId: orgId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.employeeId) query.employeeId = req.query.employeeId;

  const role = req.user.role;
  const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'];

  // Dept managers see leaves from their department(s) OR anyone who directly reports to them
  if (DEPT_MANAGER_ROLES.includes(role)) {
    const deptId = typeof req.user.departmentId === 'object' && req.user.departmentId !== null
      ? (req.user.departmentId as any)._id?.toString()
      : req.user.departmentId?.toString();

    const additionalIds: string[] = (req.user.additionalDepartmentIds || []).map((d: any) =>
      typeof d === 'object' ? d._id?.toString() : d?.toString()
    ).filter(Boolean);

    const allDeptIds = [...(deptId ? [deptId] : []), ...additionalIds];

    // Also find users who directly report to this manager via the hierarchy
    const directReports = await User.find({
      organizationId: orgId,
      reportingTo: req.user._id,
    }).select('_id');
    const directReportIds = directReports.map(u => u._id.toString());

    if (allDeptIds.length > 0 || directReportIds.length > 0) {
      const conditions: any[] = [];
      if (allDeptIds.length > 0) conditions.push({ departmentId: { $in: allDeptIds } });
      if (directReportIds.length > 0) conditions.push({ employeeId: { $in: directReportIds } });
      query.$or = conditions;
    }
  }

  const leaves = await LeaveRequest.find(query)
    .populate('employeeId', 'name email designation')
    .populate('departmentId', 'name')
    .sort('-appliedAt');

  res.status(200).json({ success: true, count: leaves.length, data: leaves });
});

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.employeeId = req.user._id;
  // organizationId and departmentId may be populated objects — extract the _id
  req.body.organizationId = typeof req.user.organizationId === 'object' && req.user.organizationId !== null
    ? (req.user.organizationId as any)._id ?? req.user.organizationId
    : req.user.organizationId;
  req.body.departmentId = typeof req.user.departmentId === 'object' && req.user.departmentId !== null
    ? (req.user.departmentId as any)._id ?? req.user.departmentId
    : req.user.departmentId;

  const leave = await LeaveRequest.create(req.body);

  // Notify department manager(s) — users in same dept with admin role
  if (req.user.departmentId) {
    const deptManagers = await User.find({
      organizationId: req.user.organizationId,
      departmentId: req.user.departmentId,
      role: { $in: ['ops_admin', 'finance_admin', 'hr_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'] },
      status: 'active',
    }).select('_id');

    for (const mgr of deptManagers) {
      await sendNotification(
        mgr._id.toString(),
        req.user.organizationId.toString(),
        'New Leave Request',
        `${req.user.name} has submitted a ${req.body.type} leave request from ${new Date(req.body.startDate).toLocaleDateString()} to ${new Date(req.body.endDate).toLocaleDateString()}.`,
        'leave',
        'medium'
      );
    }
  }

  res.status(201).json({ success: true, data: leave });
});

export const approveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findById(req.params.id);

  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  const { action, remarks } = req.body;

  if (req.user.role === 'hr_admin') {
    leave.status = action === 'approve' ? 'approved' : 'rejected';
    leave.hrRemarks = remarks;
    leave.hrApprovedBy = req.user._id;
  } else {
    leave.status = action === 'approve' ? 'dept_approved' : 'rejected';
    leave.deptAdminRemarks = remarks;
    leave.deptApprovedBy = req.user._id;
  }

  await leave.save();
  res.status(200).json({ success: true, data: leave });
});

// Attendance
export const getAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.employeeId) query.employeeId = req.query.employeeId;
  if (req.query.date) query.date = new Date(req.query.date as string);

  const attendance = await Attendance.find(query)
    .populate('employeeId', 'name email designation')
    .sort('-date');

  res.status(200).json({ success: true, count: attendance.length, data: attendance });
});

export const markAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const attendance = await Attendance.create(req.body);
  res.status(201).json({ success: true, data: attendance });
});

// Vacancies
export const getVacancies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;

  const vacancies = await Vacancy.find(query).populate('departmentId', 'name');
  res.status(200).json({ success: true, count: vacancies.length, data: vacancies });
});

export const createVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const vacancy = await Vacancy.create(req.body);
  res.status(201).json({ success: true, data: vacancy });
});

export const updateVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!vacancy) {
    res.status(404).json({ success: false, message: 'Vacancy not found' });
    return;
  }

  res.status(200).json({ success: true, data: vacancy });
});

// Complaints
export const getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;

  const complaints = await Complaint.find(query)
    .populate('employeeId', 'name email')
    .sort('-submittedAt');

  res.status(200).json({ success: true, count: complaints.length, data: complaints });
});

export const createComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.employeeId = req.user._id;
  req.body.organizationId = req.user.organizationId;

  const complaint = await Complaint.create(req.body);
  res.status(201).json({ success: true, data: complaint });
});

export const updateComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!complaint) {
    res.status(404).json({ success: false, message: 'Complaint not found' });
    return;
  }

  res.status(200).json({ success: true, data: complaint });
});

// Holidays
export const getHolidays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };

  const holidays = await Holiday.find(query).sort('date');
  res.status(200).json({ success: true, count: holidays.length, data: holidays });
});

export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const holiday = await Holiday.create(req.body);
  res.status(201).json({ success: true, data: holiday });
});


// Get single leave request
export const getLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findById(req.params.id);

  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  res.status(200).json({ success: true, data: leave });
});

// Update leave request
export const updateLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  res.status(200).json({ success: true, data: leave });
});

// Delete leave request
export const deleteLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findByIdAndDelete(req.params.id);

  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Get single attendance
export const getAttendanceById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ success: true, data: attendance });
});

// Update attendance
export const updateAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ success: true, data: attendance });
});

// Delete attendance
export const deleteAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await Attendance.findByIdAndDelete(req.params.id);

  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Get single vacancy
export const getVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findById(req.params.id);

  if (!vacancy) {
    res.status(404).json({ success: false, message: 'Vacancy not found' });
    return;
  }

  res.status(200).json({ success: true, data: vacancy });
});

// Delete vacancy
export const deleteVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findByIdAndDelete(req.params.id);

  if (!vacancy) {
    res.status(404).json({ success: false, message: 'Vacancy not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Close vacancy
export const closeVacancy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findByIdAndUpdate(
    req.params.id,
    { status: 'closed' },
    { new: true }
  );

  if (!vacancy) {
    res.status(404).json({ success: false, message: 'Vacancy not found' });
    return;
  }

  res.status(200).json({ success: true, data: vacancy });
});

// Get single complaint
export const getComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    res.status(404).json({ success: false, message: 'Complaint not found' });
    return;
  }

  res.status(200).json({ success: true, data: complaint });
});

// Delete complaint
export const deleteComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await Complaint.findByIdAndDelete(req.params.id);

  if (!complaint) {
    res.status(404).json({ success: false, message: 'Complaint not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// Resolve complaint
export const resolveComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user._id },
    { new: true }
  );

  if (!complaint) {
    res.status(404).json({ success: false, message: 'Complaint not found' });
    return;
  }

  res.status(200).json({ success: true, data: complaint });
});

// Get single holiday
export const getHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await Holiday.findById(req.params.id);

  if (!holiday) {
    res.status(404).json({ success: false, message: 'Holiday not found' });
    return;
  }

  res.status(200).json({ success: true, data: holiday });
});

// Update holiday
export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!holiday) {
    res.status(404).json({ success: false, message: 'Holiday not found' });
    return;
  }

  res.status(200).json({ success: true, data: holiday });
});

// Delete holiday
export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);

  if (!holiday) {
    res.status(404).json({ success: false, message: 'Holiday not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// ==========================================
// ENHANCED FEATURES
// ==========================================

// @desc    Department manager approval for leave (Step 1)
// @route   PATCH /api/hr/leaves/:id/dept-approve
// @access  Private (dept managers)
export const deptApproveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findById(req.params.id)
    .populate('employeeId', 'name email');

  if (!leave) {
    res.status(404);
    throw new Error('Leave request not found');
  }

  if (leave.status !== 'pending') {
    res.status(400);
    throw new Error('Leave request has already been processed');
  }

  // Verify the leave belongs to the manager's department(s)
  const managerDeptId = typeof req.user.departmentId === 'object' && req.user.departmentId !== null
    ? (req.user.departmentId as any)._id?.toString()
    : req.user.departmentId?.toString();

  const additionalDeptIds: string[] = (req.user.additionalDepartmentIds || []).map((d: any) =>
    typeof d === 'object' ? d._id?.toString() : d?.toString()
  ).filter(Boolean);

  const allManagerDeptIds = [...(managerDeptId ? [managerDeptId] : []), ...additionalDeptIds];
  const leaveDeptId = leave.departmentId?.toString();
  const leaveEmployeeId = ((leave.employeeId as any)?._id || leave.employeeId).toString();

  // Check if this manager has authority: either same dept OR the employee reports to them
  const isDirectReport = await User.exists({
    _id: leaveEmployeeId,
    reportingTo: req.user._id,
  });

  const inManagerDept = allManagerDeptIds.length > 0 && leaveDeptId && allManagerDeptIds.includes(leaveDeptId);

  if (!inManagerDept && !isDirectReport) {
    res.status(403).json({ success: false, message: 'You can only approve leaves from your own department or direct reports' });
    return;
  }

  const { action, remarks } = req.body;
  const employeeName = (leave.employeeId as any)?.name || 'Employee';
  const orgId = leave.organizationId.toString();
  // employeeId may be a populated object — extract the _id
  const employeeId = ((leave.employeeId as any)?._id || leave.employeeId).toString();

  if (action === 'approve') {
    leave.status = 'dept_approved';
    leave.deptAdminRemarks = remarks || 'Approved by department manager';
    leave.deptApprovedBy = req.user._id;
    await leave.save();

    // Notify HR admins to take action
    const hrAdmins = await User.find({
      organizationId: leave.organizationId,
      role: 'hr_admin',
      status: 'active',
    }).select('_id');

    for (const hr of hrAdmins) {
      await sendNotification(
        hr._id.toString(),
        orgId,
        'Leave Awaiting HR Approval',
        `${employeeName}'s leave request has been approved by the department manager and is now pending your approval. Remarks: "${leave.deptAdminRemarks}"`,
        'leave',
        'medium'
      );
    }

    // Notify employee that dept approved
    await sendNotification(
      employeeId,
      orgId,
      'Leave Approved by Department',
      `Your leave request has been approved by your department manager. It is now pending HR approval. Manager remarks: "${leave.deptAdminRemarks}"`,
      'leave',
      'medium'
    );
  } else {
    leave.status = 'rejected';
    leave.deptAdminRemarks = remarks || 'Rejected by department manager';
    leave.deptApprovedBy = req.user._id;
    await leave.save();

    // Notify employee of rejection
    await sendNotification(
      employeeId,
      orgId,
      'Leave Request Rejected',
      `Your leave request has been rejected by your department manager. Reason: "${leave.deptAdminRemarks}"`,
      'leave',
      'high'
    );
  }

  res.json({
    success: true,
    data: leave,
    message: action === 'approve'
      ? 'Leave approved by department. Pending HR approval.'
      : 'Leave rejected by department.',
  });
});

// @desc    HR admin final approval for leave (Step 2)
// @route   PATCH /api/hr/leaves/:id/hr-approve
// @access  Private (hr_admin)
export const hrApproveLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await LeaveRequest.findById(req.params.id)
    .populate('employeeId', 'name email');

  if (!leave) {
    res.status(404);
    throw new Error('Leave request not found');
  }

  if (leave.status !== 'dept_approved') {
    res.status(400);
    throw new Error('Leave must be approved by department manager first');
  }

  const { action, remarks } = req.body;
  const orgId = leave.organizationId.toString();
  const employeeId = ((leave.employeeId as any)?._id || leave.employeeId).toString();
  const employeeName = (leave.employeeId as any)?.name || 'Employee';

  if (action === 'approve') {
    leave.status = 'approved';
    leave.hrRemarks = remarks || 'Approved by HR';
    leave.hrApprovedBy = req.user._id;
    await leave.save();

    // Notify employee — fully approved
    await sendNotification(
      employeeId,
      orgId,
      'Leave Request Fully Approved',
      `Your leave request has been approved by HR. You are cleared for leave. HR remarks: "${leave.hrRemarks}"`,
      'leave',
      'medium'
    );
  } else {
    leave.status = 'rejected';
    leave.hrRemarks = remarks || 'Rejected by HR';
    leave.hrApprovedBy = req.user._id;
    await leave.save();

    // Notify employee — rejected by HR
    await sendNotification(
      employeeId,
      orgId,
      'Leave Request Rejected by HR',
      `Your leave request was rejected by HR after department approval. HR reason: "${leave.hrRemarks}"`,
      'leave',
      'high'
    );

    // Also notify the dept manager who approved it
    if (leave.deptApprovedBy) {
      await sendNotification(
        leave.deptApprovedBy.toString(),
        orgId,
        'Leave Rejected by HR',
        `${employeeName}'s leave request that you approved has been rejected by HR. HR reason: "${leave.hrRemarks}"`,
        'leave',
        'low'
      );
    }
  }

  res.json({
    success: true,
    data: leave,
    message: action === 'approve' ? 'Leave fully approved.' : 'Leave rejected by HR.',
  });
});

// @desc    Validate vacancy before hiring
// @route   GET /api/v1/hr/vacancies/:id/validate
// @access  Private (hr_admin)
export const validateVacancyForHiring = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findById(req.params.id)
    .populate('departmentId', 'name');

  if (!vacancy) {
    res.status(404);
    throw new Error('Vacancy not found');
  }

  const availablePositions = vacancy.count - vacancy.filled;
  const canHire = availablePositions > 0 && vacancy.status === 'open';

  res.json({
    success: true,
    data: {
      vacancy,
      totalPositions: vacancy.count,
      filledPositions: vacancy.filled,
      availablePositions,
      canHire,
      status: vacancy.status,
    },
  });
});

// @desc    Increment filled count when hiring (called after employee creation)
// @route   PATCH /api/v1/hr/vacancies/:id/fill
// @access  Private (hr_admin)
export const fillVacancyPosition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancy = await Vacancy.findById(req.params.id);

  if (!vacancy) {
    res.status(404);
    throw new Error('Vacancy not found');
  }

  if (vacancy.filled >= vacancy.count) {
    res.status(400);
    throw new Error('All positions for this vacancy are already filled');
  }

  if (vacancy.status !== 'open') {
    res.status(400);
    throw new Error('Vacancy is not open');
  }

  vacancy.filled += 1;

  // Auto-close if all positions filled
  if (vacancy.filled >= vacancy.count) {
    vacancy.status = 'closed';
  }

  await vacancy.save();

  res.json({
    success: true,
    data: vacancy,
    message: `Position filled. ${vacancy.count - vacancy.filled} positions remaining.`,
  });
});

// @desc    Get leave approval statistics
// @route   GET /api/v1/hr/leaves/stats
// @access  Private (hr_admin, dept_admin)
export const getLeaveStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await LeaveRequest.aggregate([
    {
      $match: {
        organizationId: req.user.organizationId,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = {
    pending: 0,
    dept_approved: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    formattedStats[stat._id as keyof typeof formattedStats] = stat.count;
    formattedStats.total += stat.count;
  });

  res.json({
    success: true,
    data: formattedStats,
  });
});

// @desc    Get vacancy statistics
// @route   GET /api/v1/hr/vacancies/stats
// @access  Private (hr_admin)
export const getVacancyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vacancies = await Vacancy.find({
    organizationId: req.user.organizationId,
  });

  const stats = {
    totalVacancies: vacancies.length,
    openVacancies: vacancies.filter(v => v.status === 'open').length,
    closedVacancies: vacancies.filter(v => v.status === 'closed').length,
    totalPositions: vacancies.reduce((sum, v) => sum + v.count, 0),
    filledPositions: vacancies.reduce((sum, v) => sum + v.filled, 0),
    availablePositions: vacancies.reduce((sum, v) => sum + (v.count - v.filled), 0),
  };

  res.json({
    success: true,
    data: stats,
  });
});

// Get MY leave requests (for employees)
export const getMyLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leaves = await LeaveRequest.find({
    organizationId: req.user.organizationId,
    employeeId: req.user._id,
  })
    .populate('employeeId', 'name email designation')
    .populate('departmentId', 'name')
    .sort('-appliedAt');

  res.status(200).json({ success: true, count: leaves.length, data: leaves });
});

// Get MY attendance records (for employees)
export const getMyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId, employeeId: req.user._id };

  if (req.query.startDate && req.query.endDate) {
    query.date = {
      $gte: new Date(req.query.startDate as string),
      $lte: new Date(req.query.endDate as string),
    };
  }

  const records = await Attendance.find(query).sort('-date').limit(60);
  res.status(200).json({ success: true, count: records.length, data: records });
});

// Get MY attendance summary (week hours, etc.)
export const getMyAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekRecords = await Attendance.find({
    organizationId: req.user.organizationId,
    employeeId: req.user._id,
    date: { $gte: weekStart },
  });

  const weekHours = weekRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
  const presentDays = weekRecords.filter(r => r.status === 'present' || r.status === 'late').length;

  res.status(200).json({
    success: true,
    data: {
      weekHours: Math.round(weekHours * 10) / 10,
      presentDays,
      records: weekRecords,
    },
  });
});
import Announcement from '../models/Announcement.js';

export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  const announcements = await Announcement.find(query)
    .populate('postedBy', 'name')
    .sort('-postedAt');
  res.json({ success: true, count: announcements.length, data: announcements });
});

export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await Announcement.create({
    ...req.body,
    organizationId: req.user.organizationId,
    postedBy: req.user._id,
    postedAt: new Date(),
  });
  res.status(201).json({ success: true, data: announcement });
});

export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const announcement = await Announcement.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!announcement) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: announcement });
});

export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Announcement.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
  res.json({ success: true, data: {} });
});

// ─── Employee Activity Report ─────────────────────────────────────────────────
import HRSettings from '../models/HRSettings.js';
import AuditLog from '../models/AuditLog.js';
import Task from '../models/Task.js';
import Department from '../models/Department.js';

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  const userFilter: any = { organizationId: orgId, status: 'active' };
  if (req.query.userId) userFilter._id = req.query.userId;
  if (req.query.departmentId) userFilter.departmentId = req.query.departmentId;

  const users = await User.find(userFilter)
    .select('name email role designation departmentId')
    .populate('departmentId', 'name type')
    .lean();

  if (!users.length) {
    return res.json({ success: true, data: [], departments: [], date: dateStr });
  }

  const userIds = users.map((u: any) => u._id);

  const [attendances, tasks, auditLogs, hrSettings] = await Promise.all([
    Attendance.find({ organizationId: orgId, employeeId: { $in: userIds }, date: { $gte: dayStart, $lte: dayEnd } }).lean(),
    Task.find({
      organizationId: orgId,
      assignedTo: { $in: userIds },
      $or: [
        { createdAt: { $gte: dayStart, $lte: dayEnd } },
        { updatedAt: { $gte: dayStart, $lte: dayEnd } },
        { completedAt: { $gte: dayStart, $lte: dayEnd } },
      ],
    }).select('assignedTo title status priority completedAt createdAt updatedAt').lean(),
    AuditLog.find({ organizationId: orgId, userId: { $in: userIds }, timestamp: { $gte: dayStart, $lte: dayEnd } })
      .select('userId action entityType timestamp').lean(),
    HRSettings.findOne({ organizationId: orgId }).lean(),
  ]);

  const breakMinutes: number = (hrSettings as any)?.officeHours?.breakDurationMinutes ?? 60;

  // Helper: get scheduled hours for a given day name, respecting per-day overrides
  const getScheduledHours = (dayName?: string): number => {
    if (!hrSettings) return 8;
    const overrides: any[] = (hrSettings as any).officeHours?.dayOverrides || [];
    const ov = dayName ? overrides.find((o: any) => o.day === dayName) : null;
    const inStr = ov?.checkInTime || (hrSettings as any).officeHours.checkInTime || '09:00';
    const outStr = ov?.checkOutTime || (hrSettings as any).officeHours.checkOutTime || '18:00';
    const brk = ov?.breakDurationMinutes ?? breakMinutes;
    const [inH, inM] = inStr.split(':').map(Number);
    const [outH, outM] = outStr.split(':').map(Number);
    return ((outH * 60 + outM) - (inH * 60 + inM) - brk) / 60;
  };

  // Default scheduled hours (used for dept summary)
  const scheduledHours = getScheduledHours();

  const attMap: Record<string, any> = {};
  (attendances as any[]).forEach(a => { attMap[a.employeeId.toString()] = a; });

  const taskMap: Record<string, any[]> = {};
  (tasks as any[]).forEach(t => {
    const id = t.assignedTo.toString();
    if (!taskMap[id]) taskMap[id] = [];
    taskMap[id].push(t);
  });

  const auditMap: Record<string, any[]> = {};
  (auditLogs as any[]).forEach(l => {
    const id = l.userId.toString();
    if (!auditMap[id]) auditMap[id] = [];
    auditMap[id].push(l);
  });

  const report = (users as any[]).map(u => {
    const id = u._id.toString();
    const att = attMap[id];
    const userTasks = taskMap[id] || [];
    const userLogs = auditMap[id] || [];

    const rawWorkingHours: number = att?.workingHours ?? 0;
    const productiveHours = att?.checkIn ? Math.max(0, rawWorkingHours - breakMinutes / 60) : 0;
    // Use per-day scheduled hours if available
    const dayName = att?.date ? new Date(att.date).toLocaleDateString('en-US', { weekday: 'long' }) : undefined;
    const empScheduledHours = getScheduledHours(dayName);
    const timeWasted = att?.checkIn && att?.checkOut ? Math.max(0, empScheduledHours - productiveHours) : null;

    const erpActivity: Record<string, number> = {};
    userLogs.forEach((l: any) => {
      const key = l.entityType || l.action || 'other';
      erpActivity[key] = (erpActivity[key] || 0) + 1;
    });

    const completedToday = userTasks.filter((t: any) =>
      t.completedAt && new Date(t.completedAt) >= dayStart && new Date(t.completedAt) <= dayEnd
    ).length;

    return {
      userId: id,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      department: (u.departmentId as any)?.name || '—',
      departmentId: u.departmentId,
      attendance: att ? {
        status: att.status,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        isLate: att.isLate,
        lateMinutes: att.lateMinutes,
        workingHours: rawWorkingHours,
      } : null,
      productiveHours: Math.round(productiveHours * 100) / 100,
      scheduledHours: Math.round(empScheduledHours * 100) / 100,
      timeWasted: timeWasted !== null ? Math.round(timeWasted * 100) / 100 : null,
      breakMinutes,
      erpActions: userLogs.length,
      erpActivity,
      tasks: {
        total: userTasks.length,
        completedToday,
        inProgress: userTasks.filter((t: any) => t.status === 'in_progress').length,
        overdue: userTasks.filter((t: any) => t.status === 'overdue').length,
        list: userTasks.slice(0, 10),
      },
    };
  });

  // Department rollup
  const deptSummary: Record<string, any> = {};
  report.forEach(r => {
    const deptId = r.departmentId?.toString() || 'unknown';
    if (!deptSummary[deptId]) {
      deptSummary[deptId] = { departmentId: deptId, name: r.department, totalEmployees: 0, present: 0, absent: 0, late: 0, avgProductiveHours: 0, totalErpActions: 0, totalTasksCompleted: 0 };
    }
    const d = deptSummary[deptId];
    d.totalEmployees++;
    if (r.attendance) {
      if (['present', 'late'].includes(r.attendance.status)) d.present++;
      if (r.attendance.isLate) d.late++;
    } else {
      d.absent++;
    }
    d.avgProductiveHours += r.productiveHours;
    d.totalErpActions += r.erpActions;
    d.totalTasksCompleted += r.tasks.completedToday;
  });
  Object.values(deptSummary).forEach((d: any) => {
    d.avgProductiveHours = d.totalEmployees > 0 ? Math.round((d.avgProductiveHours / d.totalEmployees) * 100) / 100 : 0;
  });

  res.json({ success: true, date: dateStr, breakMinutes, scheduledHours, data: report, departments: Object.values(deptSummary) });
});
