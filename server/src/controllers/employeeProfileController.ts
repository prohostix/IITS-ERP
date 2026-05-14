import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import EmployeeProfile from '../models/EmployeeProfile.js';
import User from '../models/User.js';
import SalaryConfig from '../models/SalaryConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /hr/employee-profiles/:userId
export const getEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;

  const [profile, user, salaryConfig] = await Promise.all([
    EmployeeProfile.findOne({ userId, organizationId: orgId })
      .populate('userId', 'name email phone designation role status avatar departmentId branchId reportingTo')
      .populate({ path: 'userId', populate: { path: 'departmentId', select: 'name type' } })
      .populate('reportingManagerId', 'name designation'),
    User.findById(userId).populate('departmentId', 'name type').populate('reportingTo', 'name designation'),
    SalaryConfig.findOne({ userId, organizationId: orgId }),
  ]);

  res.json({ success: true, data: { profile, user, salaryConfig } });
});

// PUT /hr/employee-profiles/:userId  (upsert)
export const upsertEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;

  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId, organizationId: orgId },
    { ...req.body, userId, organizationId: orgId },
    { new: true, upsert: true, runValidators: true }
  ).populate('userId', 'name email designation role')
   .populate('reportingManagerId', 'name designation');

  res.json({ success: true, data: profile });
});

// PATCH /hr/employee-profiles/:userId/kpis  — replace all KPIs
export const updateKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;
  const { kpis } = req.body;

  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId, organizationId: orgId },
    { kpis, userId, organizationId: orgId },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: profile });
});

// PATCH /hr/employee-profiles/:userId/kras  — replace all KRAs
export const updateKRAs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;
  const { kras } = req.body;

  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId, organizationId: orgId },
    { kras, userId, organizationId: orgId },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: profile });
});

// PATCH /hr/employee-profiles/:userId/salary  — update salary details
export const updateSalaryDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const orgId = req.user.organizationId;

  // Update profile salary fields
  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId, organizationId: orgId },
    {
      $set: {
        ctc: req.body.ctc,
        basicSalary: req.body.basicSalary,
        bankName: req.body.bankName,
        bankAccountNo: req.body.bankAccountNo,
        ifscCode: req.body.ifscCode,
        panNumber: req.body.panNumber,
        userId,
        organizationId: orgId,
      }
    },
    { new: true, upsert: true }
  );

  // Also upsert SalaryConfig if salary structure provided
  if (req.body.salaryConfig) {
    await SalaryConfig.findOneAndUpdate(
      { userId, organizationId: orgId },
      { ...req.body.salaryConfig, userId, organizationId: orgId, createdBy: req.user._id },
      { new: true, upsert: true }
    );
  }

  res.json({ success: true, data: profile });
});
