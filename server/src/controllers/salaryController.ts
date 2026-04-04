import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import SalaryConfig from '../models/SalaryConfig.js';
import LeaveAllocation from '../models/LeaveAllocation.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const EXCLUDED_ROLES = ['ceo', 'org_admin', 'superadmin'];

// ─── Salary Config ────────────────────────────────────────────────────────────

export const getSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await SalaryConfig.find({ organizationId: req.user.organizationId })
    .populate('userId', 'name email designation role departmentId')
    .populate({ path: 'userId', populate: { path: 'departmentId', select: 'name' } })
    .sort('userId');
  res.json({ success: true, count: configs.length, data: configs });
});

export const getSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await SalaryConfig.findOne({
    organizationId: req.user.organizationId,
    userId: req.params.userId,
  }).populate('userId', 'name email designation role');
  res.json({ success: true, data: config || null });
});

export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;

  const config = await SalaryConfig.findOneAndUpdate(
    { organizationId: orgId, userId },
    {
      ...req.body,
      organizationId: orgId,
      userId,
      createdBy: req.user._id,
      // Reset approval whenever HR saves/updates
      approvalStatus: 'pending_approval',
      approvedBy: undefined,
      approvedAt: undefined,
      rejectedRemarks: undefined,
    },
    { new: true, upsert: true, runValidators: true }
  ).populate('userId', 'name email designation role');

  res.json({ success: true, data: config });
});

export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  await SalaryConfig.findOneAndDelete({
    organizationId: req.user.organizationId,
    userId: req.params.userId,
  });
  res.json({ success: true, data: {} });
});

// ─── Leave Allocation ─────────────────────────────────────────────────────────

export const getLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocations = await LeaveAllocation.find({
    organizationId: req.user.organizationId,
    year,
  }).populate('userId', 'name email designation role departmentId')
    .populate({ path: 'userId', populate: { path: 'departmentId', select: 'name' } });
  res.json({ success: true, count: allocations.length, data: allocations });
});

export const getLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocation = await LeaveAllocation.findOne({
    organizationId: req.user.organizationId,
    userId: req.params.userId,
    year,
  }).populate('userId', 'name email designation role');
  res.json({ success: true, data: allocation || null });
});

export const upsertLeaveAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;
  const year = req.body.year || new Date().getFullYear();

  const allocation = await LeaveAllocation.findOneAndUpdate(
    { organizationId: orgId, userId, year },
    { ...req.body, organizationId: orgId, userId, year, createdBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  ).populate('userId', 'name email designation role');

  res.json({ success: true, data: allocation });
});

// Bulk initialize leave allocations for all employees for a year
export const bulkInitLeaveAllocations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const year = req.body.year || new Date().getFullYear();
  const defaults = {
    sickLeave: req.body.sickLeave ?? 12,
    casualLeave: req.body.casualLeave ?? 12,
    earnedLeave: req.body.earnedLeave ?? 15,
    complementaryLeave: req.body.complementaryLeave ?? 0,
  };

  const users = await User.find({
    organizationId: orgId,
    role: { $nin: EXCLUDED_ROLES },
    status: 'active',
  }).select('_id');

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await LeaveAllocation.findOne({ organizationId: orgId, userId: user._id, year });
    if (existing) { skipped++; continue; }
    await LeaveAllocation.create({
      organizationId: orgId,
      userId: user._id,
      year,
      ...defaults,
      createdBy: req.user._id,
    });
    created++;
  }

  res.json({ success: true, message: `Created ${created} allocations, skipped ${skipped} existing` });
});

// ─── Smart Payroll Generation ─────────────────────────────────────────────────

export const generateSmartPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month } = req.body; // YYYY-MM
  if (!month) {
    res.status(400).json({ success: false, message: 'month is required (YYYY-MM)' });
    return;
  }

  const orgId = req.user.organizationId;
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mon = Number(monthStr);

  // Date range for the month
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  // Get all users with APPROVED salary configs only
  const configs = await SalaryConfig.find({ organizationId: orgId, approvalStatus: 'approved' })
    .populate('userId', 'name email status role');

  const created: any[] = [];
  const skipped: string[] = [];
  const errors: any[] = [];

  for (const config of configs) {
    const user = config.userId as any;
    if (!user || user.status !== 'active') continue;

    // Skip if payroll already exists
    const existing = await Payroll.findOne({ organizationId: orgId, employeeId: user._id, month });
    if (existing) { skipped.push(user.name); continue; }

    try {
      // Calculate late deductions from attendance
      const lateAttendances = await Attendance.find({
        organizationId: orgId,
        employeeId: user._id,
        date: { $gte: startDate, $lte: endDate },
        isLate: true,
      });
      const totalLateMinutes = lateAttendances.reduce((s, a) => s + (a.lateMinutes || 0), 0);
      const lateDeduction = totalLateMinutes * (config.lateDeductionPerMinute || 0);

      const allowancesTotal = Object.values(config.allowances).reduce((s, v) => s + (v || 0), 0);
      const deductionsTotal = Object.values(config.deductions).reduce((s, v) => s + (v || 0), 0) + lateDeduction;

      const grossSalary = config.basicSalary + allowancesTotal;
      const netSalary = grossSalary - deductionsTotal;

      const payroll = await Payroll.create({
        organizationId: orgId,
        employeeId: user._id,
        month,
        basicSalary: config.basicSalary,
        allowances: config.allowances,
        deductions: {
          ...config.deductions,
          other: (config.deductions.other || 0) + lateDeduction,
        },
        grossSalary,
        netSalary,
        status: 'draft',
        processedBy: req.user._id,
        processedAt: new Date(),
        remarks: lateDeduction > 0 ? `Late deduction: ₹${lateDeduction} (${totalLateMinutes} mins)` : undefined,
      });

      created.push(payroll);
    } catch (err: any) {
      errors.push({ user: user.name, error: err.message });
    }
  }

  res.json({
    success: true,
    message: `Generated ${created.length} payrolls. Skipped: ${skipped.length}. Errors: ${errors.length}`,
    data: created,
    skipped,
    errors: errors.length ? errors : undefined,
  });
});

// Also block payroll generation for unapproved configs
export const generateSmartPayrollGuarded = generateSmartPayroll; // alias kept for clarity

// ─── Finance: Salary Config Approval ─────────────────────────────────────────

export const getFinanceSalaryConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.approvalStatus = req.query.status;

  const configs = await SalaryConfig.find(query)
    .populate('userId', 'name email designation role departmentId')
    .populate({ path: 'userId', populate: { path: 'departmentId', select: 'name' } })
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort('-updatedAt');

  const summary = {
    pending_approval: await SalaryConfig.countDocuments({ organizationId: req.user.organizationId, approvalStatus: 'pending_approval' }),
    approved: await SalaryConfig.countDocuments({ organizationId: req.user.organizationId, approvalStatus: 'approved' }),
    rejected: await SalaryConfig.countDocuments({ organizationId: req.user.organizationId, approvalStatus: 'rejected' }),
  };

  res.json({ success: true, count: configs.length, summary, data: configs });
});

export const approveSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, remarks } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ success: false, message: 'action must be approve or reject' });
    return;
  }
  if (action === 'reject' && (!remarks || !remarks.trim())) {
    res.status(400).json({ success: false, message: 'remarks required when rejecting' });
    return;
  }

  const config = await SalaryConfig.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!config) {
    res.status(404).json({ success: false, message: 'Salary config not found' });
    return;
  }

  if (config.approvalStatus !== 'pending_approval') {
    res.status(400).json({ success: false, message: `Config is already ${config.approvalStatus}` });
    return;
  }

  config.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
  config.approvedBy = req.user._id;
  config.approvedAt = new Date();
  if (action === 'reject') config.rejectedRemarks = remarks;
  await config.save();

  res.json({ success: true, data: config });
});
