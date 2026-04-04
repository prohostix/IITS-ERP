import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import HRSettings from '../models/HRSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Helper function to parse time string (HH:mm) and get minutes from midnight
function getMinutesFromMidnight(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Punch In
export const punchIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, address } = req.body;

  if (!latitude || !longitude) {
    res.status(400).json({ success: false, message: 'Location coordinates are required' });
    return;
  }

  // Get HR settings (optional — if not configured, skip geofence check)
  const hrSettings = await HRSettings.findOne({ organizationId: req.user.organizationId });

  // Check if location is within allowed radius (supports multiple locations)
  const requireLocation = (hrSettings as any)?.requireLocationForCheckIn
    ?? hrSettings?.location?.requireLocationForCheckIn
    ?? false;

  if (hrSettings && requireLocation) {
    const locations: any[] = (hrSettings as any).locations?.length
      ? (hrSettings as any).locations
      : [{ // fall back to legacy single location
          name: 'Office',
          latitude: hrSettings.location.officeLatitude,
          longitude: hrSettings.location.officeLongitude,
          allowedRadius: hrSettings.location.allowedRadius,
        }];

    // Pass if employee is within ANY of the configured locations
    const withinAny = locations.some((loc: any) => {
      const dist = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
      return dist <= loc.allowedRadius;
    });

    if (!withinAny) {
      // Find nearest location for a helpful message
      let minDist = Infinity;
      let nearestName = 'office';
      let nearestRadius = 100;
      locations.forEach((loc: any) => {
        const dist = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
        if (dist < minDist) { minDist = dist; nearestName = loc.name; nearestRadius = loc.allowedRadius; }
      });
      res.status(400).json({
        success: false,
        message: `You are ${Math.round(minDist)}m away from the nearest location (${nearestName}). Must be within ${nearestRadius}m to punch in.`,
        distance: Math.round(minDist),
        allowedRadius: nearestRadius,
      });
      return;
    }
  }

  // Check if already punched in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAttendance = await Attendance.findOne({
    employeeId: req.user._id,
    date: today
  });

  if (existingAttendance && existingAttendance.checkIn) {
    res.status(400).json({ 
      success: false, 
      message: 'Already punched in today',
      checkInTime: existingAttendance.checkIn
    });
    return;
  }

  const checkInTime = new Date();
  
  // Calculate if late — use per-day override if configured
  let lateMinutes = 0;
  let isLate = false;
  if (hrSettings) {
    const dayName = checkInTime.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. 'Monday'
    const overrides: any[] = (hrSettings as any).officeHours?.dayOverrides || [];
    const dayOverride = overrides.find((o: any) => o.day === dayName);
    const expectedCheckInStr = dayOverride?.checkInTime || hrSettings.officeHours.checkInTime;
    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const expectedCheckInMinutes = getMinutesFromMidnight(expectedCheckInStr);
    const graceMinutes = hrSettings.officeHours.graceMinutes;
    lateMinutes = Math.max(0, checkInMinutes - expectedCheckInMinutes - graceMinutes);
    isLate = lateMinutes > 0;
  }

  // Create or update attendance
  const attendance = existingAttendance || new Attendance({
    employeeId: req.user._id,
    organizationId: req.user.organizationId,
    date: today,
    status: isLate ? 'late' : 'present'
  });

  attendance.checkIn = checkInTime;
  attendance.checkInLocation = {
    latitude,
    longitude,
    address
  };
  attendance.isLate = isLate;
  attendance.lateMinutes = lateMinutes;

  await attendance.save();

  res.status(200).json({ 
    success: true, 
    data: attendance,
    message: isLate ? `Checked in ${lateMinutes} minutes late` : 'Checked in successfully'
  });
});

// Punch Out
export const punchOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, address } = req.body;

  if (!latitude || !longitude) {
    res.status(400).json({ success: false, message: 'Location coordinates are required' });
    return;
  }

  // Find today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    employeeId: req.user._id,
    date: today
  });

  if (!attendance || !attendance.checkIn) {
    res.status(400).json({ success: false, message: 'No check-in record found for today' });
    return;
  }

  if (attendance.checkOut) {
    res.status(400).json({ 
      success: false, 
      message: 'Already punched out today',
      checkOutTime: attendance.checkOut
    });
    return;
  }

  const checkOutTime = new Date();
  
  // Calculate working hours
  const workingMilliseconds = checkOutTime.getTime() - attendance.checkIn.getTime();
  const workingHours = workingMilliseconds / (1000 * 60 * 60);

  attendance.checkOut = checkOutTime;
  attendance.checkOutLocation = {
    latitude,
    longitude,
    address
  };
  attendance.workingHours = Math.round(workingHours * 100) / 100;

  await attendance.save();

  res.status(200).json({ 
    success: true, 
    data: attendance,
    message: `Checked out successfully. Worked ${attendance.workingHours} hours`
  });
});

// Get today's attendance status
export const getTodayAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    employeeId: req.user._id,
    date: today
  });

  res.status(200).json({ 
    success: true, 
    data: attendance || null,
    hasPunchedIn: !!attendance?.checkIn,
    hasPunchedOut: !!attendance?.checkOut
  });
});

// Get monthly late summary
export const getMonthlyLateSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year, employeeId } = req.query;
  
  const targetEmployeeId = employeeId || req.user._id;
  
  // Calculate start and end of month
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

  const lateAttendances = await Attendance.find({
    employeeId: targetEmployeeId,
    organizationId: req.user.organizationId,
    date: { $gte: startDate, $lte: endDate },
    isLate: true
  }).sort('date');

  const totalLateMinutes = lateAttendances.reduce((sum, att) => sum + (att.lateMinutes || 0), 0);
  const lateDays = lateAttendances.length;

  // Get HR settings for comparison
  const hrSettings = await HRSettings.findOne({ organizationId: req.user.organizationId });
  const maxAllowed = hrSettings?.latePolicy.maxLateMinutesPerMonth || 60;
  const warningThreshold = hrSettings?.latePolicy.warningThreshold || 45;

  res.status(200).json({ 
    success: true, 
    data: {
      month: Number(month),
      year: Number(year),
      totalLateMinutes,
      lateDays,
      maxAllowedMinutes: maxAllowed,
      remainingMinutes: Math.max(0, maxAllowed - totalLateMinutes),
      isOverLimit: totalLateMinutes > maxAllowed,
      isNearWarning: totalLateMinutes >= warningThreshold,
      lateAttendances
    }
  });
});

// Get all attendances (with filters)
export const getAttendances = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  
  if (req.query.employeeId) query.employeeId = req.query.employeeId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.isLate) query.isLate = req.query.isLate === 'true';
  
  if (req.query.startDate && req.query.endDate) {
    query.date = {
      $gte: new Date(req.query.startDate as string),
      $lte: new Date(req.query.endDate as string)
    };
  }

  const attendances = await Attendance.find(query)
    .populate('employeeId', 'name email designation')
    .sort('-date');

  res.status(200).json({ success: true, count: attendances.length, data: attendances });
});

// Create attendance record (HR admin manual entry)
export const createAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, date, status, checkIn, checkOut, notes } = req.body;

  if (!employeeId || !date || !status) {
    res.status(400).json({ success: false, message: 'employeeId, date, and status are required' });
    return;
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const existing = await Attendance.findOne({ employeeId, date: dayStart });
  if (existing) {
    res.status(400).json({ success: false, message: 'Attendance record already exists for this employee on this date' });
    return;
  }

  const attendance = await Attendance.create({
    employeeId,
    organizationId: req.user.organizationId,
    date: dayStart,
    status,
    checkIn: checkIn ? new Date(checkIn) : undefined,
    checkOut: checkOut ? new Date(checkOut) : undefined,
    notes,
  });

  res.status(201).json({ success: true, data: attendance });
});

// Update attendance record
export const updateAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await Attendance.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ success: true, data: attendance });
});

// Delete attendance record
export const deleteAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await Attendance.findOneAndDelete({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!attendance) {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

// HR Settings Management
export const getHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await HRSettings.findOne({ organizationId: req.user.organizationId });

  if (!settings) {
    res.status(404).json({ success: false, message: 'HR settings not found' });
    return;
  }

  res.status(200).json({ success: true, data: settings });
});

export const createOrUpdateHRSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;

  const settings = await HRSettings.findOneAndUpdate(
    { organizationId: req.user.organizationId },
    req.body,
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: settings });
});

// Biometric sync - receive punch data from biometric device
export const biometricSync = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { records } = req.body;
  // records: [{ employeeId, punchTime, punchType: 'in'|'out', deviceId }]

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ success: false, message: 'records array is required' });
    return;
  }

  const results: any[] = [];

  for (const record of records) {
    try {
      const { employeeId, punchTime, punchType } = record;
      const punchDate = new Date(punchTime);
      const dayStart = new Date(punchDate);
      dayStart.setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({ employeeId, date: dayStart });

      if (punchType === 'in') {
        if (!attendance) {
          attendance = new Attendance({
            employeeId,
            organizationId: req.user.organizationId,
            date: dayStart,
            status: 'present',
            checkIn: punchDate,
            notes: 'Biometric sync',
          });
        } else if (!attendance.checkIn) {
          attendance.checkIn = punchDate;
        }
      } else if (punchType === 'out' && attendance) {
        if (!attendance.checkOut) {
          attendance.checkOut = punchDate;
          if (attendance.checkIn) {
            const ms = punchDate.getTime() - attendance.checkIn.getTime();
            attendance.workingHours = Math.round((ms / 3600000) * 100) / 100;
          }
        }
      }

      if (attendance) {
        await attendance.save();
        results.push({ employeeId, status: 'synced' });
      }
    } catch (err) {
      results.push({ employeeId: record.employeeId, status: 'error' });
    }
  }

  res.status(200).json({ success: true, data: results, synced: results.filter(r => r.status === 'synced').length });
});

// ─── Employee Activity Report (HR + CEO) ─────────────────────────────────────
// GET /hr/activity-report?date=YYYY-MM-DD&userId=...&departmentId=...
// Returns per-employee: attendance, working hours, break-adjusted productive hours,
// task activity, and ERP action count from AuditLog

import User from '../models/User.js';
import Task from '../models/Task.js';
import AuditLog from '../models/AuditLog.js';
import Department from '../models/Department.js';

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  // Date range — default today
  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  // Optional filters
  const userFilter: any = { organizationId: orgId, status: 'active' };
  if (req.query.userId) userFilter._id = req.query.userId;
  if (req.query.departmentId) userFilter.departmentId = req.query.departmentId;

  const users = await User.find(userFilter)
    .select('name email role designation departmentId')
    .populate('departmentId', 'name type')
    .lean();

  if (!users.length) {
    return res.json({ success: true, data: [], date: dateStr });
  }

  const userIds = users.map((u: any) => u._id);

  // Fetch attendance for the day
  const attendances = await Attendance.find({
    organizationId: orgId,
    employeeId: { $in: userIds },
    date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  // Fetch tasks touched on this day (created, updated, or completed)
  const tasks = await Task.find({
    organizationId: orgId,
    assignedTo: { $in: userIds },
    $or: [
      { createdAt: { $gte: dayStart, $lte: dayEnd } },
      { updatedAt: { $gte: dayStart, $lte: dayEnd } },
      { completedAt: { $gte: dayStart, $lte: dayEnd } },
    ],
  }).select('assignedTo title status priority completedAt createdAt updatedAt').lean();

  // Fetch ERP audit log actions for the day
  const auditLogs = await AuditLog.find({
    organizationId: orgId,
    userId: { $in: userIds },
    timestamp: { $gte: dayStart, $lte: dayEnd },
  }).select('userId action entityType timestamp').lean();

  // HR settings for break time
  const hrSettings = await HRSettings.findOne({ organizationId: orgId }).lean();
  const breakMinutes = hrSettings?.officeHours?.breakDurationMinutes ?? 60;

  // Build maps
  const attendanceMap: Record<string, any> = {};
  attendances.forEach((a: any) => { attendanceMap[a.employeeId.toString()] = a; });

  const taskMap: Record<string, any[]> = {};
  tasks.forEach((t: any) => {
    const id = t.assignedTo.toString();
    if (!taskMap[id]) taskMap[id] = [];
    taskMap[id].push(t);
  });

  const auditMap: Record<string, any[]> = {};
  auditLogs.forEach((l: any) => {
    const id = l.userId.toString();
    if (!auditMap[id]) auditMap[id] = [];
    auditMap[id].push(l);
  });

  // Build per-employee report
  const report = users.map((u: any) => {
    const id = u._id.toString();
    const att = attendanceMap[id];
    const userTasks = taskMap[id] || [];
    const userLogs = auditMap[id] || [];

    // Working hours from attendance
    const rawWorkingHours = att?.workingHours ?? 0;
    // Productive hours = working hours minus break (only if checked in)
    const productiveHours = att?.checkIn
      ? Math.max(0, rawWorkingHours - breakMinutes / 60)
      : 0;

    // ERP activity breakdown by entity type
    const erpActivity: Record<string, number> = {};
    userLogs.forEach((l: any) => {
      const key = l.entityType || l.action || 'other';
      erpActivity[key] = (erpActivity[key] || 0) + 1;
    });

    // Task stats
    const completedToday = userTasks.filter((t: any) =>
      t.completedAt && new Date(t.completedAt) >= dayStart && new Date(t.completedAt) <= dayEnd
    ).length;
    const inProgress = userTasks.filter((t: any) => t.status === 'in_progress').length;
    const overdue = userTasks.filter((t: any) => t.status === 'overdue').length;

    // Time wasted = scheduled hours - productive hours (if present)
    const scheduledHours = hrSettings
      ? (() => {
          const [inH, inM] = (hrSettings.officeHours.checkInTime || '09:00').split(':').map(Number);
          const [outH, outM] = (hrSettings.officeHours.checkOutTime || '18:00').split(':').map(Number);
          return ((outH * 60 + outM) - (inH * 60 + inM) - breakMinutes) / 60;
        })()
      : 8;

    const timeWasted = att?.checkIn && att?.checkOut
      ? Math.max(0, scheduledHours - productiveHours)
      : null;

    return {
      userId: id,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      department: (u.departmentId as any)?.name || '—',
      departmentId: u.departmentId,
      attendance: att
        ? {
            status: att.status,
            checkIn: att.checkIn,
            checkOut: att.checkOut,
            isLate: att.isLate,
            lateMinutes: att.lateMinutes,
            workingHours: rawWorkingHours,
          }
        : null,
      productiveHours: Math.round(productiveHours * 100) / 100,
      scheduledHours: Math.round(scheduledHours * 100) / 100,
      timeWasted: timeWasted !== null ? Math.round(timeWasted * 100) / 100 : null,
      breakMinutes,
      erpActions: userLogs.length,
      erpActivity,
      tasks: {
        total: userTasks.length,
        completedToday,
        inProgress,
        overdue,
        list: userTasks.slice(0, 10),
      },
    };
  });

  // Department summary
  const deptSummary: Record<string, any> = {};
  report.forEach(r => {
    const deptId = r.departmentId?.toString() || 'unknown';
    if (!deptSummary[deptId]) {
      deptSummary[deptId] = {
        departmentId: deptId,
        name: r.department,
        totalEmployees: 0,
        present: 0,
        absent: 0,
        late: 0,
        avgProductiveHours: 0,
        totalErpActions: 0,
        totalTasksCompleted: 0,
      };
    }
    const d = deptSummary[deptId];
    d.totalEmployees++;
    if (r.attendance) {
      if (r.attendance.status === 'present' || r.attendance.status === 'late') d.present++;
      if (r.attendance.isLate) d.late++;
    } else {
      d.absent++;
    }
    d.avgProductiveHours += r.productiveHours;
    d.totalErpActions += r.erpActions;
    d.totalTasksCompleted += r.tasks.completedToday;
  });

  Object.values(deptSummary).forEach((d: any) => {
    d.avgProductiveHours = d.totalEmployees > 0
      ? Math.round((d.avgProductiveHours / d.totalEmployees) * 100) / 100
      : 0;
  });

  res.json({
    success: true,
    date: dateStr,
    breakMinutes,
    data: report,
    departments: Object.values(deptSummary),
  });
});
