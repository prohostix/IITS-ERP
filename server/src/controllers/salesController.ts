// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mapPrismaToFrontendCourseType } from '../utils/courseTypeHelper.js';

// Leads
export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leads = await prisma.lead.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, count: leads.length, data: leads });
});
export const getLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: lead });
});
export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, contactName, centerName, address } = req.body;
  const finalContactName = contactName || name || 'Unknown Contact';
  const finalCenterName = centerName || 'General Center';
  const finalAddress = address || 'Not Provided';

  const allowedFields = ['email', 'phone', 'source', 'referredBy', 'status', 'notes', 'convertedAt'];
  const dbData: any = {
    contactName: finalContactName,
    centerName: finalCenterName,
    address: finalAddress,
    organizationId: req.user.organizationId
  };

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) dbData[field] = req.body[field];
  }

  const lead = await prisma.lead.create({
    data: dbData
  });
  res.status(201).json({ success: true, data: { ...lead, _id: lead.id } });
});
export const updateLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: { ...lead, _id: lead.id } });
});
export const deleteLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});
export const convertLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status: 'converted' as any, convertedAt: new Date() } });
  res.json({ success: true, data: lead });
});

// Targets
export const getTargets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targets = await prisma.target.findMany({ where: { organizationId: req.user.organizationId }, include: { employee: true } });
  res.json({ success: true, count: targets.length, data: targets });
});
export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: target });
});
export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.create({ data: { ...req.body, organizationId: req.user.organizationId } });
  res.status(201).json({ success: true, data: target });
});
export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: target });
});
export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.target.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Invites
export const listMyInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invites = await prisma.studyCenterInvite.findMany({ where: { referredBy: req.user.id } });
  res.json({ success: true, count: invites.length, data: invites });
});
export const generateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invite = await prisma.studyCenterInvite.create({
    data: { ...req.body, organizationId: req.user.organizationId, referredBy: req.user.id, token: Math.random().toString(36).substring(7).toUpperCase() }
  });
  res.status(201).json({ success: true, data: invite });
});
export const regenerateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invite = await prisma.studyCenterInvite.update({ where: { id: req.params.id }, data: { token: Math.random().toString(36).substring(7).toUpperCase() } });
  res.json({ success: true, data: invite });
});

// Performance
export const getTeamPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

// Recursive helper to get all subordinate user IDs
async function getAllSubordinateIds(managerId: string): Promise<string[]> {
  const subordinates = await prisma.user.findMany({
    where: { reportingTo: managerId },
    select: { id: true }
  });
  const ids = subordinates.map(s => s.id);
  if (ids.length === 0) return [];
  const subPromises = ids.map(id => getAllSubordinateIds(id));
  const subIds = await Promise.all(subPromises);
  return [...ids, ...subIds.flat()];
}

// Study Centers
export const getMyCenters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  let whereClause: any = { organizationId: req.user.organizationId };
  
  if (!isAuth) {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    const visibleUserIds = [req.user.id, ...subordinateIds];
    whereClause.referredBy = { in: visibleUserIds };
  }

  const centers = await prisma.studyCenter.findMany({
    where: whereClause,
    include: {
      referrer: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });
  res.json({ success: true, data: centers });
});

export const getMyCenterAdmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  let whereCenterClause: any = { organizationId: req.user.organizationId };
  
  if (!isAuth) {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    const visibleUserIds = [req.user.id, ...subordinateIds];
    whereCenterClause.referredBy = { in: visibleUserIds };
  }

  const visibleCenters = await prisma.studyCenter.findMany({
    where: whereCenterClause,
    select: { id: true }
  });

  const centerIds = visibleCenters.map(c => c.id);

  const admissions = await prisma.enrollment.findMany({
    where: {
      studyCenterId: { in: centerIds }
    },
    include: {
      program: { select: { name: true } },
      studyCenter: { select: { name: true } }
    }
  });
  res.json({ success: true, data: admissions });
});

export const getMyCenterDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const center = await prisma.studyCenter.findUnique({
    where: { id: req.params.studyCenterId },
    include: {
      referrer: { select: { id: true, name: true, email: true, role: true } },
      allowedPrograms: true,
      associatedUniversities: true
    }
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  if (!isAuth) {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    const visibleUserIds = [req.user.id, ...subordinateIds];
    if (!center.referredBy || !visibleUserIds.includes(center.referredBy)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studyCenterId: center.id },
    include: { program: true }
  });

  // Group by program
  const byProgramMap = new Map<string, { program: any, students: any[] }>();
  for (const e of enrollments) {
    const progId = e.programId;
    if (!byProgramMap.has(progId)) {
      byProgramMap.set(progId, {
        program: e.program,
        students: []
      });
    }
    byProgramMap.get(progId)!.students.push({
      id: e.id,
      studentName: e.studentName,
      studentEmail: e.studentEmail,
      enrollmentNumber: e.enrollmentNumber || 'N/A',
      status: e.status
    });
  }
  const byProgram = Array.from(byProgramMap.values());

  const stats = {
    totalStudents: enrollments.length,
    enrolled: enrollments.filter(e => e.status === 'enrolled').length,
    pending: enrollments.filter(e => ['payment_pending', 'document_review', 'finance_review'].includes(e.status)).length,
    rejected: enrollments.filter(e => e.status === 'rejected' || e.status === 'department_rejected').length
  };

  res.json({
    success: true,
    data: {
      center: {
        ...center,
        associatedUniversityIds: center.associatedUniversities,
        allowedProgramIds: center.allowedPrograms
      },
      enrollments,
      byProgram,
      stats
    }
  });
});

export const getTeamMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  let users;
  if (isAuth) {
    users = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        role: { in: ['sales_admin', 'bde', 'employee'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
  } else {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    users = await prisma.user.findMany({
      where: {
        id: { in: subordinateIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
  }
  res.json({ success: true, data: users });
});

export const reassignCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studyCenterId } = req.params;
  const { newSalesUserId } = req.body;

  if (!newSalesUserId) {
    res.status(400).json({ success: false, message: 'New sales user ID is required' });
    return;
  }

  const center = await prisma.studyCenter.findUnique({
    where: { id: studyCenterId }
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  if (!isAuth) {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    if (!subordinateIds.includes(newSalesUserId)) {
      res.status(403).json({ success: false, message: 'You can only reassign to sales users on your team' });
      return;
    }
  } else {
    const targetUser = await prisma.user.findUnique({
      where: { id: newSalesUserId }
    });
    if (!targetUser || targetUser.organizationId !== req.user.organizationId) {
      res.status(400).json({ success: false, message: 'Invalid target user' });
      return;
    }
  }

  const updatedCenter = await prisma.studyCenter.update({
    where: { id: studyCenterId },
    data: { referredBy: newSalesUserId },
    include: {
      referrer: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  res.json({ success: true, data: updatedCenter });
});

// Programs
export const getProgramsByUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const programs = await prisma.program.findMany({ where: { universityId: req.query.universityId as string } });
  const mapped = programs.map(p => ({
    ...p,
    courseType: mapPrismaToFrontendCourseType(p.courseType)
  }));
  res.json({ success: true, data: mapped });
});

// Sales Staff Admission Report
export const getSalesStaffAdmissionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const isGlobalAuth = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'ops_admin', 'ops_sub_admin'].includes(req.user.role);

  const selectedYear = req.query.year ? (req.query.year === 'all' ? 'all' : parseInt(req.query.year as string, 10)) : new Date().getFullYear();
  const selectedMonth = req.query.month ? (req.query.month === 'all' ? 'all' : parseInt(req.query.month as string, 10)) : 'all';
  const staffIdFilter = req.query.staffId && req.query.staffId !== 'all' ? (req.query.staffId as string) : null;
  const statusFilter = req.query.status && req.query.status !== 'all' ? (req.query.status as string) : null;
  const search = req.query.search ? (req.query.search as string).trim().toLowerCase() : '';

  // Determine allowed sales staff IDs
  let staffWhere: any = {
    organizationId,
    status: 'active',
    OR: [
      { role: { in: ['sales_admin', 'sales_sub_admin', 'bde'] } },
      { department: { type: 'sales' } }
    ]
  };

  if (!isGlobalAuth) {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    const visibleUserIds = [req.user.id, ...subordinateIds];
    staffWhere.id = { in: visibleUserIds };
  }

  if (staffIdFilter) {
    staffWhere.id = staffIdFilter;
  }

  const salesStaff = await prisma.user.findMany({
    where: staffWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      designation: true,
      branch: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } }
    },
    orderBy: { name: 'asc' }
  });

  const staffIds = salesStaff.map(s => s.id);

  // Fetch all study centers referred by these sales staff members
  const studyCenters = await prisma.studyCenter.findMany({
    where: {
      organizationId,
      referredBy: { in: staffIds }
    },
    select: {
      id: true,
      name: true,
      code: true,
      referredBy: true
    }
  });

  const centerToStaffMap = new Map<string, string>();
  const staffToCenterCountMap = new Map<string, number>();
  for (const c of studyCenters) {
    if (c.referredBy) {
      centerToStaffMap.set(c.id, c.referredBy);
      staffToCenterCountMap.set(c.referredBy, (staffToCenterCountMap.get(c.referredBy) || 0) + 1);
    }
  }

  const allReferredCenterIds = Array.from(centerToStaffMap.keys());

  // Fetch enrollments tied to sales staff (via salesUserId, studyCenter.referredBy, or student.referredBy)
  const enrollmentWhere: any = {
    organizationId,
    OR: [
      { salesUserId: { in: staffIds } },
      ...(allReferredCenterIds.length > 0 ? [{ studyCenterId: { in: allReferredCenterIds } }] : []),
      { student: { referredBy: { in: staffIds } } }
    ]
  };

  if (statusFilter) {
    enrollmentWhere.status = statusFilter;
  }

  const allEnrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true } }
        }
      },
      studyCenter: {
        select: {
          id: true,
          name: true,
          code: true,
          referredBy: true
        }
      },
      session: { select: { id: true, name: true } },
      salesUser: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, name: true, email: true, referredBy: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate year bounds for availableYears
  const yearsSet = new Set<number>();
  yearsSet.add(new Date().getFullYear());
  for (const e of allEnrollments) {
    const d = e.admissionDate || e.enrolledAt || e.createdAt;
    if (d) yearsSet.add(new Date(d).getFullYear());
  }
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // Group enrollments per sales staff
  const staffMetricsMap = new Map<string, {
    totalAdmissions: number;
    enrolledCount: number;
    pendingCount: number;
    rejectedCount: number;
    totalRevenue: number;
    monthlyTrend: number[];
    admissions: any[];
  }>();

  for (const s of salesStaff) {
    staffMetricsMap.set(s.id, {
      totalAdmissions: 0,
      enrolledCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalRevenue: 0,
      monthlyTrend: Array(12).fill(0),
      admissions: []
    });
  }

  const filteredAdmissionsList: any[] = [];

  for (const e of allEnrollments) {
    // Determine which staff member this enrollment belongs to
    let staffId = e.salesUserId;
    if (!staffId && e.studyCenterId) {
      staffId = centerToStaffMap.get(e.studyCenterId) || null;
    }
    if (!staffId && e.student?.referredBy) {
      staffId = e.student.referredBy;
    }

    if (!staffId || !staffMetricsMap.has(staffId)) continue;

    const dateVal = e.admissionDate || e.enrolledAt || e.createdAt;
    const admissionDate = new Date(dateVal);
    const admissionYear = admissionDate.getFullYear();
    const admissionMonth = admissionDate.getMonth() + 1; // 1-12

    // Apply Year and Month filters for stats aggregation and list
    const matchesYear = selectedYear === 'all' || admissionYear === selectedYear;
    const matchesMonth = selectedMonth === 'all' || admissionMonth === selectedMonth;

    // Monthly trend is tracked for the selected year (or current year if 'all')
    const trendYear = selectedYear === 'all' ? new Date().getFullYear() : selectedYear;
    if (admissionYear === trendYear) {
      const metrics = staffMetricsMap.get(staffId)!;
      metrics.monthlyTrend[admissionMonth - 1] += 1;
    }

    if (matchesYear && matchesMonth) {
      const metrics = staffMetricsMap.get(staffId)!;
      metrics.totalAdmissions += 1;

      if (e.status === 'enrolled') {
        metrics.enrolledCount += 1;
      } else if (e.status === 'rejected' || e.status === 'department_rejected') {
        metrics.rejectedCount += 1;
      } else {
        metrics.pendingCount += 1;
      }

      const fee = Number(e.totalFee) || 0;
      metrics.totalRevenue += fee;

      const staffObj = salesStaff.find(s => s.id === staffId);
      const admissionItem = {
        id: e.id,
        enrollmentNumber: e.enrollmentNumber || 'N/A',
        studentName: e.studentName,
        studentEmail: e.studentEmail,
        studentPhone: e.studentPhone,
        programName: e.program?.name || 'N/A',
        programCode: e.program?.code || '',
        universityName: e.program?.university?.name || 'N/A',
        studyCenterName: e.studyCenter?.name || 'Direct',
        studyCenterCode: e.studyCenter?.code || '',
        status: e.status,
        admissionDate: dateVal,
        totalFee: fee,
        salesStaff: {
          id: staffId,
          name: staffObj?.name || 'Unknown',
          email: staffObj?.email || '',
          role: staffObj?.role || ''
        }
      };

      // Apply search filter if specified
      if (search) {
        const matchesSearch = 
          admissionItem.studentName.toLowerCase().includes(search) ||
          admissionItem.enrollmentNumber.toLowerCase().includes(search) ||
          admissionItem.studyCenterName.toLowerCase().includes(search) ||
          admissionItem.programName.toLowerCase().includes(search) ||
          admissionItem.salesStaff.name.toLowerCase().includes(search);
        if (!matchesSearch) continue;
      }

      metrics.admissions.push(admissionItem);
      filteredAdmissionsList.push(admissionItem);
    }
  }

  // Construct staff summary list
  const staffSummary = salesStaff.map(s => {
    const metrics = staffMetricsMap.get(s.id)!;
    const conversionRate = metrics.totalAdmissions > 0 
      ? Math.round((metrics.enrolledCount / metrics.totalAdmissions) * 100) 
      : 0;
    return {
      staff: s,
      studyCentersCount: staffToCenterCountMap.get(s.id) || 0,
      totalAdmissions: metrics.totalAdmissions,
      enrolledCount: metrics.enrolledCount,
      pendingCount: metrics.pendingCount,
      rejectedCount: metrics.rejectedCount,
      totalRevenue: metrics.totalRevenue,
      conversionRate,
      monthlyTrend: metrics.monthlyTrend,
      admissionsCount: metrics.admissions.length
    };
  }).sort((a, b) => b.totalAdmissions - a.totalAdmissions);

  // Overall summary
  const overallSummary = {
    totalStaff: salesStaff.length,
    totalAdmissions: staffSummary.reduce((acc, s) => acc + s.totalAdmissions, 0),
    totalEnrolled: staffSummary.reduce((acc, s) => acc + s.enrolledCount, 0),
    totalPending: staffSummary.reduce((acc, s) => acc + s.pendingCount, 0),
    totalRejected: staffSummary.reduce((acc, s) => acc + s.rejectedCount, 0),
    totalRevenue: staffSummary.reduce((acc, s) => acc + s.totalRevenue, 0),
    avgConversionRate: staffSummary.length > 0 && staffSummary.reduce((acc, s) => acc + s.totalAdmissions, 0) > 0
      ? Math.round((staffSummary.reduce((acc, s) => acc + s.enrolledCount, 0) / staffSummary.reduce((acc, s) => acc + s.totalAdmissions, 0)) * 100)
      : 0
  };

  res.json({
    success: true,
    data: {
      staffSummary,
      overallSummary,
      admissions: filteredAdmissionsList,
      availableYears,
      filters: {
        year: selectedYear,
        month: selectedMonth,
        staffId: staffIdFilter,
        status: statusFilter
      }
    }
  });
});

