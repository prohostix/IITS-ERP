import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import ReregRule from '../models/ReregRule.js';
import Student from '../models/Student.js';
import { asyncHandler, resolveOrgId } from '../utils/asyncHandler.js';

// @desc    Create or update REREG rules
// @route   POST /api/v1/rereg/rules
// @access  Private (finance_admin)
export const createOrUpdateReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    carryForwardEnabled,
    autoApproveThreshold,
    notifyFinanceOnMiss,
    gracePeriodDays,
    penaltyAmount,
    escalationRules,
  } = req.body;

  let rules = await ReregRule.findOne({
    organizationId: req.user.organizationId,
  });

  if (rules) {
    // Update existing rules
    rules.carryForwardEnabled = carryForwardEnabled ?? rules.carryForwardEnabled;
    rules.autoApproveThreshold = autoApproveThreshold ?? rules.autoApproveThreshold;
    rules.notifyFinanceOnMiss = notifyFinanceOnMiss ?? rules.notifyFinanceOnMiss;
    rules.gracePeriodDays = gracePeriodDays ?? rules.gracePeriodDays;
    rules.penaltyAmount = penaltyAmount ?? rules.penaltyAmount;
    rules.escalationRules = escalationRules ?? rules.escalationRules;

    await rules.save();

    res.json({
      success: true,
      data: rules,
      message: 'REREG rules updated successfully',
    });
  } else {
    // Create new rules
    rules = await ReregRule.create({
      organizationId: req.user.organizationId,
      carryForwardEnabled,
      autoApproveThreshold,
      notifyFinanceOnMiss,
      gracePeriodDays,
      penaltyAmount,
      escalationRules,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: rules,
      message: 'REREG rules created successfully',
    });
  }
});

// @desc    Get REREG rules
// @route   GET /api/v1/rereg/rules
// @access  Private (finance_admin, ops_admin)
export const getReregRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rules = await ReregRule.findOne({
    organizationId: req.user.organizationId,
  }).populate('createdBy', 'name email');

  if (!rules) {
    res.status(404);
    throw new Error('REREG rules not configured');
  }

  res.json({
    success: true,
    data: rules,
  });
});

// @desc    Get pending re-registrations
// @route   GET /api/v1/rereg/pending
// @access  Private (finance_admin, ops_admin)
export const getPendingReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Students who need re-registration
  // This is a placeholder - actual logic depends on Student model structure
  const students = await Student.find({
    organizationId: req.user.organizationId,
    status: 'active',
    // Add your re-registration criteria here
    // e.g., semester end date passed, fees pending, etc.
  })
    .populate('programId', 'name')
    .populate('universityId', 'name')
    .populate('studyCenterId', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: students.length,
    data: students,
  });
});

// @desc    Get completed re-registrations
// @route   GET /api/v1/rereg/completed
// @access  Private (finance_admin, ops_admin)
export const getCompletedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
    // Add re-registration completion criteria
  };

  if (startDate && endDate) {
    query.updatedAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  }

  const students = await Student.find(query)
    .populate('programId', 'name')
    .populate('universityId', 'name')
    .populate('studyCenterId', 'name')
    .sort({ updatedAt: -1 });

  res.json({
    success: true,
    count: students.length,
    data: students,
  });
});

// @desc    Process re-registration for a student
// @route   POST /api/v1/rereg/process/:studentId
// @access  Private (ops_admin)
export const processRereg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const { remarks, feesPaid } = req.body;

  const student = await Student.findById(studentId);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.organizationId.toString() !== resolveOrgId(req.user.organizationId)) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Get REREG rules
  const rules = await ReregRule.findOne({
    organizationId: req.user.organizationId,
  });

  // Auto-approve if threshold met
  let autoApproved = false;
  if (rules && feesPaid >= rules.autoApproveThreshold) {
    autoApproved = true;
  }

  // Update student record with rereg status
  if (!student.reregStatus) {
    student.reregStatus = {
      semester: 1,
      status: 'pending',
      feePaid: false,
    };
  }
  
  student.reregStatus.status = autoApproved ? 'completed' : 'pending';
  student.reregStatus.feePaid = feesPaid > 0;
  if (autoApproved) {
    student.reregStatus.completedAt = new Date();
  }
  
  await student.save();

  res.json({
    success: true,
    data: student,
    message: autoApproved 
      ? 'Re-registration auto-approved'
      : 'Re-registration submitted for approval',
  });
});

// @desc    Carry forward missed re-registrations (called by cron)
// @route   POST /api/v1/rereg/carryforward
// @access  Private (system/cron)
export const carryForwardMissedReregs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rules = await ReregRule.find({ carryForwardEnabled: true });

  let totalCarriedForward = 0;

  for (const rule of rules) {
    // Find students who missed re-registration
    const missedStudents = await Student.find({
      organizationId: rule.organizationId,
      'reregStatus.status': 'pending',
      // Add date criteria for missed deadline
    });

    for (const student of missedStudents) {
      // Carry forward logic
      if (student.reregStatus) {
        student.reregStatus.status = 'carry_forward';
        await student.save();
        totalCarriedForward++;

        // Notify finance if configured
        if (rule.notifyFinanceOnMiss) {
          // TODO: Send notification via Socket.io
          // io.to(`role:finance_admin:${rule.organizationId}`).emit('reregMissed', {
          //   studentId: student._id,
          //   studentName: student.name,
          // });
        }
      }
    }
  }

  res.json({
    success: true,
    message: `Carried forward ${totalCarriedForward} re-registrations`,
    count: totalCarriedForward,
  });
});

// @desc    Get REREG statistics
// @route   GET /api/v1/rereg/stats
// @access  Private (finance_admin)
export const getReregStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await Student.aggregate([
    {
      $match: {
        organizationId: req.user.organizationId,
        reregStatus: { $exists: true },
      },
    },
    {
      $group: {
        _id: '$reregStatus.status',
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = {
    pending: 0,
    completed: 0,
    carriedForward: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    if (stat._id === 'pending') {
      formattedStats.pending = stat.count;
    } else if (stat._id === 'completed') {
      formattedStats.completed = stat.count;
    } else if (stat._id === 'carry_forward') {
      formattedStats.carriedForward = stat.count;
    }
    formattedStats.total += stat.count;
  });

  res.json({
    success: true,
    data: formattedStats,
  });
});
