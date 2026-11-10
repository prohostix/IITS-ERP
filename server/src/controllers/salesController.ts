// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mapPrismaToFrontendCourseType } from '../utils/courseTypeHelper.js';
import { getBranchScope } from '../utils/branchScope.js';
import { calculateAndSyncTargets, filterTargets } from '../utils/targetHelper.js';

// Leads
export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    where.OR = [
      { referredBy: { in: scope.staffIds } },
      ...(scope.centerIds.length > 0 ? [{
        centerName: {
          in: (await prisma.studyCenter.findMany({
            where: { id: { in: scope.centerIds } },
            select: { name: true }
          })).map(c => c.name)
        }
      }] : [])
    ];
  }
  const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
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
    referredBy: req.user.role === 'branch_manager' ? req.user.id : undefined,
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
  const { status, sessionId, year, month, userId, universityId } = req.query as any;

  const where: any = { organizationId: req.user.organizationId };
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    where.OR = [
      { employeeId: { in: scope.staffIds } },
      ...(scope.centerIds.length > 0 ? [{ centerId: { in: scope.centerIds } }] : []),
      ...(scope.deptIds.length > 0 ? [{ departmentId: { in: scope.deptIds } }] : [])
    ];
  }
  const targets = await prisma.target.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true
        }
      },
      department: {
        select: {
          id: true,
          name: true
        }
      },
      center: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      university: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      session: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const syncedTargets = await calculateAndSyncTargets(targets, req.user.organizationId);
  const filtered = filterTargets(syncedTargets, { status, sessionId, year, month, userId, universityId });

  const mapped = filtered.map(t => ({
    ...t,
    employeeId: t.employee || t.employeeId,
    departmentId: t.department || t.departmentId
  }));

  res.json({ success: true, count: mapped.length, data: mapped });
});

export const getTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await prisma.target.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true
        }
      },
      department: {
        select: {
          id: true,
          name: true
        }
      },
      center: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      university: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      session: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  const [synced] = await calculateAndSyncTargets([target], req.user.organizationId);

  const mapped = {
    ...synced,
    employeeId: synced.employee || synced.employeeId,
    departmentId: synced.department || synced.departmentId
  };

  res.json({ success: true, data: mapped });
});

export const createTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeId, departmentId, centerId, universityId, sessionId, type, period, target, achieved, incentive, deadline } = req.body;

  if (!type || target === undefined || target === null || target === '') {
    res.status(400).json({ success: false, message: 'Target type and target value are required' });
    return;
  }

  const cleanTarget = parseFloat(target);
  if (isNaN(cleanTarget) || cleanTarget < 0) {
    res.status(400).json({ success: false, message: 'Target must be a valid non-negative number' });
    return;
  }

  const cleanAchieved = (achieved !== undefined && achieved !== '' && !isNaN(parseFloat(achieved)))
    ? parseFloat(achieved)
    : 0;

  const cleanIncentive = (incentive !== undefined && incentive !== '' && !isNaN(parseFloat(incentive)))
    ? parseFloat(incentive)
    : null;

  let cleanEmpId = (employeeId && employeeId !== 'none' && employeeId !== 'null') ? employeeId : null;
  let cleanDeptId = (departmentId && departmentId !== 'none' && departmentId !== 'null') ? departmentId : null;
  const cleanCenterId = (centerId && centerId !== 'none' && centerId !== 'null') ? centerId : null;
  const cleanUniId = (universityId && universityId !== 'none' && universityId !== 'null' && universityId !== 'all') ? universityId : null;
  const cleanSessionId = (sessionId && sessionId !== 'none' && sessionId !== 'null' && sessionId !== 'all') ? sessionId : null;

  // Branch Manager scoping & validation
  if (req.user.role === 'branch_manager') {
    const { branch, users: branchSalesStaff } = await getBranchSalesUsersHelper(req.user);
    const branchStaffIds = branchSalesStaff.map(u => u.id);

    // If an employee is targeted, ensure they belong to this branch's sales staff
    if (cleanEmpId && !branchStaffIds.includes(cleanEmpId)) {
      res.status(403).json({ success: false, message: 'Selected employee is not a sales user in your branch' });
      return;
    }

    // Auto-fill branch sales dept if not provided
    if (!cleanDeptId && branch?.salesDeptId) {
      cleanDeptId = branch.salesDeptId;
    }
  } else if (cleanEmpId && !cleanDeptId) {
    const emp = await prisma.user.findUnique({ where: { id: cleanEmpId }, select: { departmentId: true } });
    if (emp?.departmentId) {
      cleanDeptId = emp.departmentId;
    }
  }

  const newTarget = await prisma.target.create({
    data: {
      organizationId: req.user.organizationId,
      employeeId: cleanEmpId,
      departmentId: cleanDeptId,
      centerId: cleanCenterId,
      universityId: cleanUniId,
      sessionId: cleanSessionId,
      type,
      period: period || 'monthly',
      target: cleanTarget,
      achieved: cleanAchieved,
      incentive: cleanIncentive,
      deadline: deadline ? new Date(deadline) : null,
      status: cleanAchieved >= cleanTarget && cleanTarget > 0 ? 'completed' : 'pending'
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true
        }
      },
      department: {
        select: {
          id: true,
          name: true
        }
      },
      center: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      university: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      session: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const [synced] = await calculateAndSyncTargets([newTarget], req.user.organizationId);

  const mapped = {
    ...synced,
    employeeId: synced.employee || synced.employeeId,
    departmentId: synced.department || synced.departmentId
  };

  res.status(201).json({ success: true, data: mapped });
});

export const updateTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });

  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  const { employeeId, departmentId, centerId, universityId, sessionId, type, period, target, achieved, incentive, deadline, status } = req.body;
  const data: any = {};

  if (employeeId !== undefined) {
    data.employeeId = (employeeId && employeeId !== 'none' && employeeId !== 'null') ? employeeId : null;
  }
  if (departmentId !== undefined) {
    data.departmentId = (departmentId && departmentId !== 'none' && departmentId !== 'null') ? departmentId : null;
  }
  if (centerId !== undefined) {
    data.centerId = (centerId && centerId !== 'none' && centerId !== 'null') ? centerId : null;
  }
  if (universityId !== undefined) {
    data.universityId = (universityId && universityId !== 'none' && universityId !== 'null' && universityId !== 'all') ? universityId : null;
  }
  if (sessionId !== undefined) {
    data.sessionId = (sessionId && sessionId !== 'none' && sessionId !== 'null' && sessionId !== 'all') ? sessionId : null;
  }
  if (type !== undefined) data.type = type;
  if (period !== undefined) data.period = period;
  if (target !== undefined) {
    const t = parseFloat(target);
    if (!isNaN(t)) data.target = t;
  }
  if (achieved !== undefined) {
    const a = parseFloat(achieved);
    if (!isNaN(a)) data.achieved = a;
  }
  if (incentive !== undefined) {
    data.incentive = (incentive !== '' && incentive !== null && !isNaN(parseFloat(incentive)))
      ? parseFloat(incentive)
      : null;
  }
  if (deadline !== undefined) {
    data.deadline = deadline ? new Date(deadline) : null;
  }
  if (status !== undefined) {
    data.status = status;
  } else if (data.target !== undefined || data.achieved !== undefined) {
    const finalTarget = data.target !== undefined ? data.target : exists.target;
    const finalAchieved = data.achieved !== undefined ? data.achieved : exists.achieved;
    data.status = finalAchieved >= finalTarget && finalTarget > 0 ? 'completed' : 'pending';
  }

  const updated = await prisma.target.update({
    where: { id: req.params.id },
    data,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true
        }
      },
      department: {
        select: {
          id: true,
          name: true
        }
      },
      center: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      university: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      session: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const [synced] = await calculateAndSyncTargets([updated], req.user.organizationId);

  const mapped = {
    ...synced,
    employeeId: synced.employee || synced.employeeId,
    departmentId: synced.department || synced.departmentId
  };

  res.json({ success: true, data: mapped });
});

export const deleteTarget = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exists = await prisma.target.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId }
  });

  if (!exists) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  await prisma.target.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

// Invites
export const listMyInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invites = await prisma.studyCenterInvite.findMany({
    where: { referredBy: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, count: invites.length, data: invites });
});
export const generateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityIds, programIds, branchId, expiresAt } = req.body;
  const expiryDate = expiresAt 
    ? new Date(expiresAt) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days expiry

  const token = Math.random().toString(36).substring(2, 8).toUpperCase();

  const invite = await prisma.studyCenterInvite.create({
    data: {
      organizationId: req.user.organizationId,
      referredBy: req.user.id,
      universityIds: Array.isArray(universityIds) ? universityIds : [],
      programIds: Array.isArray(programIds) ? programIds : [],
      branchId: branchId || req.user.branchId || null,
      token,
      expiresAt: expiryDate,
      status: 'pending'
    }
  });
  res.status(201).json({ success: true, data: invite });
});
export const regenerateInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expiryDate = req.body?.expiresAt 
    ? new Date(req.body.expiresAt) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = Math.random().toString(36).substring(2, 8).toUpperCase();

  const invite = await prisma.studyCenterInvite.update({
    where: { id: req.params.id },
    data: {
      token,
      status: 'pending',
      expiresAt: expiryDate,
      usedAt: null
    }
  });
  res.json({ success: true, data: invite });
});

// Helper to resolve sales team members for the caller based on role & hierarchy
async function resolveSalesTeamUsers(user: any, organizationId: string) {
  const isGlobal = ['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(user.role);

  if (isGlobal) {
    return prisma.user.findMany({
      where: {
        organizationId,
        status: 'active',
        id: { not: user.id },
        OR: [
          { role: { in: ['sales', 'sales_admin', 'bda', 'counselor'] } },
          { department: { type: 'sales' } }
        ]
      },
      select: {
        id: true,
        name: true,
        status: true,
        designation: true,
        role: true,
        branchId: true,
        designationRef: { select: { title: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Branch Manager
  if (user.role === 'branch_manager' || user.managedBranch?.id) {
    const scope = await getBranchScope(user);
    const branchStaff = await prisma.user.findMany({
      where: {
        id: { in: scope.staffIds.filter((id: string) => id !== user.id) },
        status: 'active',
        organizationId
      },
      select: {
        id: true,
        name: true,
        status: true,
        designation: true,
        role: true,
        branchId: true,
        department: { select: { type: true } },
        designationRef: { select: { title: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Filter to sales department or sales roles, fallback to all branch staff if none specific
    const salesStaff = branchStaff.filter(
      u => ['sales', 'sales_admin', 'bda', 'counselor'].includes(u.role) || u.department?.type === 'sales'
    );
    return salesStaff.length > 0 ? salesStaff : branchStaff;
  }

  // Hierarchy downline resolution for Sales Admins, Managers, TLs, etc.
  const [allUsers, allDesignations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: {
        id: true,
        name: true,
        status: true,
        reportingTo: true,
        designationId: true,
        departmentId: true,
        branchId: true,
        role: true,
        designation: true,
        department: { select: { type: true } },
        designationRef: { select: { title: true, name: true } }
      }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true }
    })
  ]);

  const subordinateIds = new Set<string>();

  // 1. Direct & recursive reportingTo
  const queue = [user.id];
  const visited = new Set<string>([user.id]);
  while (queue.length > 0) {
    const currId = queue.shift()!;
    for (const u of allUsers) {
      if (u.reportingTo === currId && !visited.has(u.id)) {
        visited.add(u.id);
        subordinateIds.add(u.id);
        queue.push(u.id);
      }
    }
  }

  // 2. Designation hierarchy downline
  if (user.designationId) {
    const childDesigIds = new Set<string>();
    const desigQueue = [user.designationId];
    while (desigQueue.length > 0) {
      const currDesigId = desigQueue.shift()!;
      for (const d of allDesignations) {
        if (d.parentDesignationId === currDesigId && !childDesigIds.has(d.id)) {
          childDesigIds.add(d.id);
          desigQueue.push(d.id);
        }
      }
    }
    for (const u of allUsers) {
      if (u.designationId && childDesigIds.has(u.designationId) && u.id !== user.id) {
        if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
          subordinateIds.add(u.id);
        }
      }
    }
  }

  // 3. Fallback for branch sales admin with no designation hierarchy resolved
  if (subordinateIds.size === 0 && user.departmentId) {
    for (const u of allUsers) {
      if (u.departmentId === user.departmentId && u.id !== user.id) {
        if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
          subordinateIds.add(u.id);
        }
      }
    }
  }

  return allUsers.filter(u => subordinateIds.has(u.id) && u.status === 'active');
}

// Performance
export const getTeamPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const teamUsers = await resolveSalesTeamUsers(req.user, orgId);

  if (teamUsers.length === 0) {
    res.json({ success: true, count: 0, data: [] });
    return;
  }

  const userIds = teamUsers.map(u => u.id);

  const [leads, targets] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: orgId, referredBy: { in: userIds } },
      select: { referredBy: true, status: true }
    }),
    prisma.target.findMany({
      where: { organizationId: orgId, employeeId: { in: userIds } },
      select: { employeeId: true, target: true, achieved: true, status: true }
    })
  ]);

  const teamMembers = teamUsers.map(u => {
    const userLeads = leads.filter(l => l.referredBy === u.id);
    const leadCount = userLeads.length;
    const convertedCount = userLeads.filter(l => l.status === 'converted').length;
    const conversionRate = leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0;

    const userTargets = targets.filter(t => t.employeeId === u.id);
    const targetCount = userTargets.length;
    const targetTotal = userTargets.reduce((sum, t) => sum + (t.target || 0), 0);
    const targetAchieved = userTargets.reduce((sum, t) => sum + (t.achieved || 0), 0);
    const targetProgress = targetTotal > 0 ? Math.round((targetAchieved / targetTotal) * 100) : 0;

    let score = 0;
    if (targetTotal > 0) {
      score = Math.round(targetProgress * 0.6 + conversionRate * 0.4);
    } else if (leadCount > 0) {
      score = conversionRate;
    }
    score = Math.min(100, Math.max(0, score));

    const desigTitle = u.designation || u.designationRef?.title || u.designationRef?.name || (u.role ? u.role.replace(/_/g, ' ') : 'Team Member');

    return {
      id: u.id,
      name: u.name,
      designation: desigTitle,
      status: u.status || 'active',
      leads: leadCount,
      converted: convertedCount,
      conversionRate,
      targetCount,
      targetAchieved,
      targetTotal,
      targetProgress,
      score
    };
  });

  // Sort by score desc, then converted desc, then leads desc, then name asc
  teamMembers.sort((a, b) => b.score - a.score || b.converted - a.converted || b.leads - a.leads || a.name.localeCompare(b.name));

  res.json({ success: true, count: teamMembers.length, data: teamMembers });
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
  
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    whereClause.id = { in: scope.centerIds };
  } else if (!isAuth) {
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
  
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    whereCenterClause.id = { in: scope.centerIds };
  } else if (!isAuth) {
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
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    if (!scope.centerIds.includes(center.id)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
  } else if (!isAuth) {
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

// Helper to resolve sales users for a branch manager
export async function getBranchSalesUsersHelper(user: any) {
  let branch = null;
  if (user.branchId) {
    branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
      include: { salesDept: true, operationsDept: true }
    });
  }
  if (!branch) {
    branch = await prisma.branch.findFirst({
      where: { branchManagerId: user.id },
      include: { salesDept: true, operationsDept: true }
    });
  }

  if (!branch) return { branch: null, users: [] };

  const salesDeptId = branch.salesDeptId;
  const opsDeptId = branch.operationsDeptId;

  const users = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      status: { notIn: ['resigned', 'terminated'] },
      role: { notIn: ['student', 'center_admin', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin'] },
      AND: [
        opsDeptId ? { departmentId: { not: opsDeptId } } : {},
        {
          OR: [
            ...(salesDeptId ? [
              { departmentId: salesDeptId },
              { subDepartment: { parentDeptId: salesDeptId } }
            ] : []),
            {
              branchId: branch.id,
              OR: [
                { department: { type: 'sales' } },
                { department: { name: { contains: 'Sales', mode: 'insensitive' } } },
                { role: { in: ['sales_admin', 'sales_sub_admin', 'bde', 'counselor', 'telecaller', 'employee'] } }
              ]
            }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      departmentId: true,
      branchId: true,
      department: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return { branch, users };
}

// Sales users list for target assignment and management
export const getSalesUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isGlobalAuth = ['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(req.user.role);

  if (req.user.role === 'branch_manager') {
    const { branch, users } = await getBranchSalesUsersHelper(req.user);
    res.json({
      success: true,
      count: users.length,
      data: users,
      branch: branch ? { id: branch.id, name: branch.name, salesDeptId: branch.salesDeptId } : null
    });
    return;
  }

  if (isGlobalAuth) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { notIn: ['resigned', 'terminated'] },
        role: { notIn: ['student', 'center_admin', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin'] },
        OR: [
          { department: { type: 'sales' } },
          { department: { name: { contains: 'Sales', mode: 'insensitive' } } },
          { role: { in: ['sales_admin', 'sales_sub_admin', 'bde', 'counselor', 'telecaller'] } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        branchId: true,
        department: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, count: users.length, data: users });
    return;
  }

  // Other sales roles: subordinates or same sales dept
  const subordinateIds = await getAllSubordinateIds(req.user.id);
  const users = await prisma.user.findMany({
    where: {
      organizationId: req.user.organizationId,
      status: { notIn: ['resigned', 'terminated'] },
      role: { notIn: ['student', 'center_admin', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin'] },
      OR: [
        { id: { in: [req.user.id, ...subordinateIds] } },
        ...(req.user.departmentId ? [{ departmentId: req.user.departmentId }] : [])
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      departmentId: true,
      branchId: true,
      department: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  res.json({ success: true, count: users.length, data: users });
});

export const getTeamMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAuth = ['superadmin', 'org_admin', 'ceo'].includes(req.user.role);
  let users;
  if (req.user.role === 'branch_manager') {
    const { users: branchSalesStaff } = await getBranchSalesUsersHelper(req.user);
    users = branchSalesStaff;
  } else if (isAuth) {
    users = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { notIn: ['resigned', 'terminated'] },
        role: { in: ['sales_admin', 'sales_sub_admin', 'bde', 'counselor', 'employee'] },
        OR: [
          { department: { type: 'sales' } },
          { department: { name: { contains: 'Sales', mode: 'insensitive' } } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        department: { select: { id: true, name: true, type: true } }
      },
      orderBy: { name: 'asc' }
    });
  } else {
    const subordinateIds = await getAllSubordinateIds(req.user.id);
    users = await prisma.user.findMany({
      where: {
        id: { in: subordinateIds },
        status: { notIn: ['resigned', 'terminated'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        department: { select: { id: true, name: true, type: true } }
      },
      orderBy: { name: 'asc' }
    });
  }
  res.json({ success: true, count: users.length, data: users });
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
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    if (!scope.centerIds.includes(studyCenterId)) {
      res.status(403).json({ success: false, message: 'This center is not in your branch' });
      return;
    }
    if (!scope.staffIds.includes(newSalesUserId)) {
      res.status(403).json({ success: false, message: 'Target user is not in your branch' });
      return;
    }
  } else if (!isAuth) {
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

  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    staffWhere.id = { in: scope.staffIds };
  } else if (!isGlobalAuth) {
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

