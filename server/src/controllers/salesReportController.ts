// @ts-nocheck
import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import prisma from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getBranchScope } from '../utils/branchScope.js';

const GLOBAL_AUTH_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'ops_admin', 'ops_sub_admin', 'finance_admin'];

/**
 * Recursive helper to fetch all subordinate IDs for a manager
 */
/**
 * Builds user in-memory map with full designation & reporting hierarchy resolution.
 * In this ERP, reporting hierarchies are primarily modeled via Designation.parentDesignationId
 * with users assigned via User.designationId. Direct User.reportingTo and Branch.branchManagerId
 * are also incorporated to resolve complete chains up to Branch Managers and Executives.
 */
async function buildUserHierarchyMap(organizationId: string) {
  const [allUsers, allDesignations, allBranches] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        designationId: true,
        reportingTo: true,
        branchId: true,
        departmentId: true,
        branch: { select: { id: true, name: true, branchManagerId: true } },
        department: { select: { id: true, name: true, type: true } }
      }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: {
        id: true,
        title: true,
        level: true,
        parentDesignationId: true,
        branchId: true,
        departmentId: true
      }
    }),
    prisma.branch.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: {
        id: true,
        name: true,
        code: true,
        branchManagerId: true
      }
    })
  ]);

  const userMap = new Map<string, typeof allUsers[0]>();
  for (const u of allUsers) {
    userMap.set(u.id, u);
  }

  const desigMap = new Map<string, typeof allDesignations[0]>();
  for (const d of allDesignations) {
    desigMap.set(d.id, d);
  }

  const branchMap = new Map<string, typeof allBranches[0]>();
  for (const b of allBranches) {
    branchMap.set(b.id, b);
  }

  const branchByName = new Map<string, typeof allBranches[0]>();
  for (const b of allBranches) {
    if (b.name) branchByName.set(b.name.trim().toLowerCase(), b);
  }

  // Group users by designation
  const usersByDesigId = new Map<string, typeof allUsers>();
  for (const u of allUsers) {
    if (u.designationId) {
      if (!usersByDesigId.has(u.designationId)) {
        usersByDesigId.set(u.designationId, []);
      }
      usersByDesigId.get(u.designationId)!.push(u);
    }
  }

  // Helper to format designation / title
  const getUserTitle = (user: any): string => {
    if (!user) return 'Staff';
    if (user.designation && user.designation.trim()) return user.designation.trim();
    if (user.designationId && desigMap.has(user.designationId)) {
      return desigMap.get(user.designationId)!.title;
    }
    if (user.role === 'branch_manager') return 'Branch Manager';
    if (user.role === 'bde') return 'BDE';
    if (user.role === 'team_leader') return 'Team Leader';
    return (user.role || 'Staff').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  // Helper to get effective branch ID
  const getUserBranchId = (user: any): string | null => {
    if (!user) return null;
    if (user.branchId) return user.branchId;
    if (user.designationId && desigMap.has(user.designationId)) {
      return desigMap.get(user.designationId)!.branchId || null;
    }
    return user.branch?.id || null;
  };

  // Helper to get effective branch name
  const getUserBranchName = (user: any): string => {
    if (!user) return 'N/A';
    const bId = getUserBranchId(user);
    if (bId && branchMap.has(bId)) return branchMap.get(bId)!.name;
    return user.branch?.name || 'N/A';
  };

  // Helper to resolve reporting chain upwards
  const resolveChain = (userId: string | null | undefined) => {
    if (!userId || !userMap.has(userId)) return [];
    const chain: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      designation: string;
      branch: string;
      level: number;
    }> = [];

    const user = userMap.get(userId)!;
    const visited = new Set<string>([userId]);
    const userBranchId = getUserBranchId(user);
    const userDeptId = user.departmentId || (user.designationId ? desigMap.get(user.designationId)?.departmentId : null);

    // 1. Direct reportingTo (if assigned)
    let currDirectId = user.reportingTo;
    let level = 1;
    while (currDirectId && userMap.has(currDirectId) && !visited.has(currDirectId) && level <= 5) {
      visited.add(currDirectId);
      const mgr = userMap.get(currDirectId)!;
      chain.push({
        id: mgr.id,
        name: mgr.name,
        email: mgr.email,
        role: mgr.role || 'employee',
        designation: getUserTitle(mgr),
        branch: getUserBranchName(mgr),
        level
      });
      currDirectId = mgr.reportingTo;
      level++;
    }

    // 2. Designation hierarchy traversal
    let currDesigId = user.designationId;
    const visitedDesigs = new Set<string>();
    while (currDesigId && desigMap.has(currDesigId) && !visitedDesigs.has(currDesigId) && level <= 10) {
      visitedDesigs.add(currDesigId);
      const currDesig = desigMap.get(currDesigId)!;
      const parentDesigId = currDesig.parentDesignationId;
      if (!parentDesigId || !desigMap.has(parentDesigId)) break;

      const candidates = usersByDesigId.get(parentDesigId) || [];
      // Pick best candidate: same branch & dept > same branch > same dept > any
      let bestCandidate = candidates.find(c => {
        const cBranch = getUserBranchId(c);
        const cDept = c.departmentId || (c.designationId ? desigMap.get(c.designationId)?.departmentId : null);
        return userBranchId && cBranch === userBranchId && userDeptId && cDept === userDeptId;
      }) || candidates.find(c => {
        const cBranch = getUserBranchId(c);
        return userBranchId && cBranch === userBranchId;
      }) || candidates.find(c => {
        const cDept = c.departmentId || (c.designationId ? desigMap.get(c.designationId)?.departmentId : null);
        return userDeptId && cDept === userDeptId;
      }) || candidates[0];

      if (bestCandidate && !visited.has(bestCandidate.id)) {
        visited.add(bestCandidate.id);
        chain.push({
          id: bestCandidate.id,
          name: bestCandidate.name,
          email: bestCandidate.email,
          role: bestCandidate.role || 'employee',
          designation: getUserTitle(bestCandidate),
          branch: getUserBranchName(bestCandidate),
          level
        });
        level++;
      }
      currDesigId = parentDesigId;
    }

    // 3. Ensure Branch Manager is in chain if user belongs to a branch
    if (userBranchId && branchMap.has(userBranchId)) {
      const bmId = branchMap.get(userBranchId)!.branchManagerId;
      if (bmId && !visited.has(bmId) && userMap.has(bmId)) {
        const bm = userMap.get(bmId)!;
        visited.add(bm.id);
        chain.push({
          id: bm.id,
          name: bm.name,
          email: bm.email,
          role: bm.role || 'branch_manager',
          designation: getUserTitle(bm) || 'Branch Manager',
          branch: getUserBranchName(bm),
          level: level++
        });
      }
    }

    return chain;
  };

  // Subordinate user IDs resolution
  const getSubordinateIds = (managerId: string): string[] => {
    const subIds = new Set<string>();
    // Direct reporting
    for (const u of allUsers) {
      if (u.reportingTo === managerId) {
        subIds.add(u.id);
      }
    }

    const mgr = userMap.get(managerId);
    if (!mgr) return Array.from(subIds);

    // If manager is branch manager of a branch, all users in that branch are subordinates
    const managedBranches = allBranches.filter(b => b.branchManagerId === managerId);
    for (const mb of managedBranches) {
      for (const u of allUsers) {
        if (getUserBranchId(u) === mb.id && u.id !== managerId) {
          subIds.add(u.id);
        }
      }
    }

    // If manager has a designation, find all child designations recursively
    if (mgr.designationId && desigMap.has(mgr.designationId)) {
      const childDesigIds = new Set<string>();
      const queue = [mgr.designationId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const d of allDesignations) {
          if (d.parentDesignationId === current && !childDesigIds.has(d.id)) {
            childDesigIds.add(d.id);
            queue.push(d.id);
          }
        }
      }

      const mgrBranchId = getUserBranchId(mgr);
      for (const cdId of childDesigIds) {
        const usersInDesig = usersByDesigId.get(cdId) || [];
        for (const u of usersInDesig) {
          const uBranchId = getUserBranchId(u);
          if (!mgrBranchId || !uBranchId || uBranchId === mgrBranchId) {
            subIds.add(u.id);
          }
        }
      }
    }

    return Array.from(subIds);
  };

  return {
    userMap,
    desigMap,
    branchMap,
    branchByName,
    getUserTitle,
    getUserBranchId,
    getUserBranchName,
    resolveChain,
    getSubordinateIds,
    allUsers,
    allBranches
  };
}

// ============================================================================
// 1. Admission Report: Center Admissions with Full Reporting Hierarchy
// ============================================================================
export const getAdmissionHierarchyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const isGlobalAuth = GLOBAL_AUTH_ROLES.includes(req.user.role);

  const { year, month, sessionId, status, search, managerId, branchId } = req.query as Record<string, string>;

  const selectedYear = year && year !== 'all' ? parseInt(year, 10) : 'all';
  const selectedMonth = month && month !== 'all' ? parseInt(month, 10) : 'all';

  const {
    userMap,
    desigMap,
    branchMap,
    branchByName,
    getUserTitle,
    getUserBranchId,
    getUserBranchName,
    resolveChain,
    getSubordinateIds,
    allUsers,
    allBranches
  } = await buildUserHierarchyMap(organizationId);

  // Scoping centers & staff
  let allowedCenterIds: string[] | null = null;
  let allowedStaffIds: string[] | null = null;

  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    allowedCenterIds = scope.centerIds;
    allowedStaffIds = scope.staffIds;
  } else if (!isGlobalAuth) {
    const subordinateIds = getSubordinateIds(req.user.id);
    allowedStaffIds = [req.user.id, ...subordinateIds];
  }

  // Base centers where clause
  const centerWhere: any = { organizationId };
  if (allowedCenterIds !== null) {
    centerWhere.id = { in: allowedCenterIds };
  } else if (allowedStaffIds !== null) {
    centerWhere.referredBy = { in: allowedStaffIds };
  }

  if (branchId && branchId !== 'all') {
    centerWhere.branchName = branchId;
  }

  const centers = await prisma.studyCenter.findMany({
    where: centerWhere,
    select: {
      id: true,
      name: true,
      code: true,
      branchName: true,
      status: true,
      referredBy: true,
      createdAt: true
    },
    orderBy: { name: 'asc' }
  });

  const centerIds = centers.map(c => c.id);

  // Fetch enrollments for these centers
  const enrollmentWhere: any = {
    organizationId,
    studyCenterId: { in: centerIds }
  };

  if (sessionId && sessionId !== 'all') {
    enrollmentWhere.sessionId = sessionId;
  }

  if (status && status !== 'all') {
    enrollmentWhere.status = status;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    select: {
      id: true,
      studyCenterId: true,
      salesUserId: true,
      sessionId: true,
      status: true,
      totalFee: true,
      admissionDate: true,
      enrolledAt: true,
      createdAt: true
    }
  });

  // Aggregate admissions per study center
  const centerAdmissionsMap = new Map<string, {
    total: number;
    completed: number;
    pending: number;
    rejected: number;
    revenue: number;
  }>();

  for (const c of centers) {
    centerAdmissionsMap.set(c.id, {
      total: 0,
      completed: 0,
      pending: 0,
      rejected: 0,
      revenue: 0
    });
  }

  for (const e of enrollments) {
    if (!e.studyCenterId || !centerAdmissionsMap.has(e.studyCenterId)) continue;

    const dateVal = e.admissionDate || e.enrolledAt || e.createdAt;
    if (dateVal) {
      const d = new Date(dateVal);
      const eYear = d.getFullYear();
      const eMonth = d.getMonth() + 1;
      if (selectedYear !== 'all' && eYear !== selectedYear) continue;
      if (selectedMonth !== 'all' && eMonth !== selectedMonth) continue;
    }

    const stat = centerAdmissionsMap.get(e.studyCenterId)!;
    stat.total += 1;
    if (e.status === 'enrolled') {
      stat.completed += 1;
    } else if (e.status === 'rejected' || e.status === 'department_rejected') {
      stat.rejected += 1;
    } else {
      stat.pending += 1;
    }
    stat.revenue += Number(e.totalFee) || 0;
  }

  // Build center items with full hierarchy attribution
  const centerItems = centers.map(c => {
    const stats = centerAdmissionsMap.get(c.id) || { total: 0, completed: 0, pending: 0, rejected: 0, revenue: 0 };
    const referrer = c.referredBy ? userMap.get(c.referredBy) : null;
    const chain = resolveChain(c.referredBy);

    // Determine referrer designation & branch
    const referrerTitle = referrer ? getUserTitle(referrer) : 'Unassigned';
    const referrerBranch = referrer ? getUserBranchName(referrer) : (c.branchName || 'N/A');

    const assignedStaff = referrer ? {
      id: referrer.id,
      name: referrer.name,
      email: referrer.email,
      role: referrer.role,
      designation: referrerTitle,
      branch: referrerBranch
    } : null;

    // Detect rank of the referrer
    const isSelfTL = referrer ? (/team\s*leader|\btl\b/i.test(referrerTitle) || referrer.role === 'team_leader') : false;
    const isSelfAsstBDM = referrer ? ((/bdm|business\s*development\s*manager/i.test(referrerTitle) || /asst|assistant/i.test(referrerTitle)) && !isSelfTL) : false;
    const isSelfBranchMgr = referrer ? (/branch\s*manager|\bdm\b|district/i.test(referrerTitle) || referrer.role === 'branch_manager') : false;

    // Find managers in chain
    const chainTL = chain.find(m => /team\s*leader|\btl\b/i.test(m.designation) || m.role === 'team_leader');
    const chainAsstBDM = chain.find(m => (/bdm|business\s*development\s*manager/i.test(m.designation) || /asst|assistant/i.test(m.designation)) && !/team\s*leader|\btl\b/i.test(m.designation));
    const chainDM = chain.find(m => /district\s*manager|\bdm\b/i.test(m.designation) || m.role === 'district_manager');
    const chainBM = chain.find(m => /branch\s*manager/i.test(m.designation) || m.role === 'branch_manager');

    // Fallback branch manager from center's branch if unassigned or not in chain
    let fallbackBM: any = null;
    const centerBranchObj = c.branchName ? branchByName.get(c.branchName.trim().toLowerCase()) : null;
    if (centerBranchObj?.branchManagerId && userMap.has(centerBranchObj.branchManagerId)) {
      const bmUser = userMap.get(centerBranchObj.branchManagerId)!;
      fallbackBM = {
        id: bmUser.id,
        name: bmUser.name,
        email: bmUser.email,
        role: bmUser.role || 'branch_manager',
        designation: getUserTitle(bmUser) || 'Branch Manager',
        branch: centerBranchObj.name,
        level: 99
      };
    }

    // 1. Team Leader (TL)
    let teamLeader: any = null;
    if (isSelfTL && assignedStaff) {
      teamLeader = {
        id: assignedStaff.id,
        name: assignedStaff.name,
        email: assignedStaff.email,
        role: assignedStaff.role,
        designation: assignedStaff.designation,
        branch: assignedStaff.branch
      };
    } else if (!isSelfAsstBDM && !isSelfBranchMgr) {
      teamLeader = chainTL || (chain.length > 0 ? chain[0] : null);
    }

    // 2. Assistant BDM / BDM
    let assistantBDM: any = null;
    if (isSelfAsstBDM && assignedStaff) {
      assistantBDM = {
        id: assignedStaff.id,
        name: assignedStaff.name,
        email: assignedStaff.email,
        role: assignedStaff.role,
        designation: assignedStaff.designation,
        branch: assignedStaff.branch
      };
    } else if (!isSelfBranchMgr) {
      assistantBDM = chainAsstBDM || (chain.length > 1 ? chain[1] : null);
    }

    // 3. District / Branch Mgr
    let districtManager: any = null;
    let branchManager: any = null;

    if (isSelfBranchMgr && assignedStaff) {
      districtManager = {
        id: assignedStaff.id,
        name: assignedStaff.name,
        email: assignedStaff.email,
        role: assignedStaff.role,
        designation: assignedStaff.designation,
        branch: assignedStaff.branch
      };
      branchManager = districtManager;
    } else {
      districtManager = chainDM || chainBM || fallbackBM || (chain.length > 2 ? chain[2] : null);
      branchManager = chainBM || fallbackBM || (chain.length > 3 ? chain[3] : null);
    }

    const hierarchyParts = [
      assignedStaff ? `${assignedStaff.name} (${assignedStaff.designation})` : 'Unassigned',
      teamLeader && teamLeader.id !== assignedStaff?.id ? `${teamLeader.name} (${teamLeader.designation})` : null,
      assistantBDM && assistantBDM.id !== assignedStaff?.id && assistantBDM.id !== teamLeader?.id ? `${assistantBDM.name} (${assistantBDM.designation})` : null,
      districtManager && districtManager.id !== assignedStaff?.id && districtManager.id !== assistantBDM?.id ? `${districtManager.name} (${districtManager.designation})` : null
    ].filter(Boolean);

    return {
      centerId: c.id,
      centerName: c.name,
      centerCode: c.code,
      branchName: c.branchName || referrerBranch,
      status: c.status,
      createdAt: c.createdAt,
      totalAdmissions: stats.total,
      completedAdmissions: stats.completed,
      pendingAdmissions: stats.pending,
      rejectedAdmissions: stats.rejected,
      totalRevenue: stats.revenue,
      assignedStaff,
      teamLeader,
      assistantBDM,
      districtManager,
      branchManager,
      hierarchyChain: chain,
      hierarchyText: hierarchyParts.join(' ➔ ')
    };
  });

  // Filter centerItems by search and managerId
  let filteredCenterItems = centerItems;
  if (search) {
    const q = search.trim().toLowerCase();
    filteredCenterItems = filteredCenterItems.filter(item =>
      item.centerName.toLowerCase().includes(q) ||
      (item.centerCode && item.centerCode.toLowerCase().includes(q)) ||
      (item.branchName && item.branchName.toLowerCase().includes(q)) ||
      (item.assignedStaff?.name && item.assignedStaff.name.toLowerCase().includes(q)) ||
      (item.teamLeader?.name && item.teamLeader.name.toLowerCase().includes(q)) ||
      (item.assistantBDM?.name && item.assistantBDM.name.toLowerCase().includes(q)) ||
      (item.districtManager?.name && item.districtManager.name.toLowerCase().includes(q)) ||
      (item.branchManager?.name && item.branchManager.name.toLowerCase().includes(q))
    );
  }

  if (managerId && managerId !== 'all') {
    filteredCenterItems = filteredCenterItems.filter(item =>
      item.hierarchyChain.some(m => m.id === managerId) ||
      item.assignedStaff?.id === managerId ||
      item.teamLeader?.id === managerId ||
      item.assistantBDM?.id === managerId ||
      item.districtManager?.id === managerId ||
      item.branchManager?.id === managerId
    );
  }

  // Sort by completed admissions descending
  filteredCenterItems.sort((a, b) => b.completedAdmissions - a.completedAdmissions);

  // Roll-up Summary by Reporting Authority
  const authorityStatsMap = new Map<string, {
    authority: any;
    centersCount: number;
    totalAdmissions: number;
    completedAdmissions: number;
    pendingAdmissions: number;
    rejectedAdmissions: number;
    totalRevenue: number;
    subordinatesCount: number;
  }>();

  const registerAuthority = (auth: any) => {
    if (!auth || !auth.id) return;
    if (!authorityStatsMap.has(auth.id)) {
      const subCount = getSubordinateIds(auth.id).length;
      authorityStatsMap.set(auth.id, {
        authority: {
          id: auth.id,
          name: auth.name,
          email: auth.email,
          role: auth.role,
          designation: auth.designation,
          branch: auth.branch
        },
        centersCount: 0,
        totalAdmissions: 0,
        completedAdmissions: 0,
        pendingAdmissions: 0,
        rejectedAdmissions: 0,
        totalRevenue: 0,
        subordinatesCount: subCount
      });
    }
  };

  for (const item of centerItems) {
    // Collect all unique authorities governing this center
    const authList: any[] = [];
    if (item.teamLeader) authList.push(item.teamLeader);
    if (item.assistantBDM && !authList.some(a => a.id === item.assistantBDM.id)) authList.push(item.assistantBDM);
    if (item.districtManager && !authList.some(a => a.id === item.districtManager.id)) authList.push(item.districtManager);
    if (item.branchManager && !authList.some(a => a.id === item.branchManager.id)) authList.push(item.branchManager);
    for (const m of item.hierarchyChain) {
      if (!authList.some(a => a.id === m.id)) authList.push(m);
    }

    for (const auth of authList) {
      registerAuthority(auth);
      const stat = authorityStatsMap.get(auth.id)!;
      stat.centersCount += 1;
      stat.totalAdmissions += item.totalAdmissions;
      stat.completedAdmissions += item.completedAdmissions;
      stat.pendingAdmissions += item.pendingAdmissions;
      stat.rejectedAdmissions += item.rejectedAdmissions;
      stat.totalRevenue += item.totalRevenue;
    }
  }

  const authoritySummary = Array.from(authorityStatsMap.values())
    .sort((a, b) => b.completedAdmissions - a.completedAdmissions);

  // Overall totals
  const overall = {
    totalCenters: filteredCenterItems.length,
    totalAdmissions: filteredCenterItems.reduce((acc, c) => acc + c.totalAdmissions, 0),
    completedAdmissions: filteredCenterItems.reduce((acc, c) => acc + c.completedAdmissions, 0),
    pendingAdmissions: filteredCenterItems.reduce((acc, c) => acc + c.pendingAdmissions, 0),
    rejectedAdmissions: filteredCenterItems.reduce((acc, c) => acc + c.rejectedAdmissions, 0),
    totalRevenue: filteredCenterItems.reduce((acc, c) => acc + c.totalRevenue, 0),
    activeAuthoritiesCount: authoritySummary.length
  };

  // Distinct reporting authorities for dropdown filter
  const availableManagers = Array.from(authorityStatsMap.values()).map(s => ({
    id: s.authority.id,
    name: s.authority.name,
    designation: s.authority.designation
  }));

  res.json({
    success: true,
    data: {
      centers: filteredCenterItems,
      authoritySummary,
      overall,
      availableManagers,
      filters: { year: selectedYear, month: selectedMonth, sessionId, status, managerId, branchId }
    }
  });
});

// ============================================================================
// 2. Target vs. Achievement Report: Monthly Performance with Dynamic Real-Time Stats
// ============================================================================
export const getTargetVsAchievementReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const isGlobalAuth = GLOBAL_AUTH_ROLES.includes(req.user.role);

  const { year, month, type, status, search, branchId, staffId } = req.query as Record<string, string>;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const targetYear = year && year !== 'all' ? parseInt(year, 10) : currentYear;
  const targetMonth = month && month !== 'all' ? parseInt(month, 10) : currentMonth;

  // Date range for real-time achievement matching
  let dateFrom: Date;
  let dateTo: Date;
  if (month === 'all') {
    dateFrom = new Date(targetYear, 0, 1);
    dateTo = new Date(targetYear, 11, 31, 23, 59, 59, 999);
  } else {
    dateFrom = new Date(targetYear, targetMonth - 1, 1);
    dateTo = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
  }

  const { userMap, resolveChain, getSubordinateIds, getUserTitle } = await buildUserHierarchyMap(organizationId);

  // Scoping
  let allowedStaffIds: string[] | null = null;
  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    allowedStaffIds = scope.staffIds;
  } else if (!isGlobalAuth) {
    const subordinateIds = getSubordinateIds(req.user.id);
    allowedStaffIds = [req.user.id, ...subordinateIds];
  }

  // Fetch targets
  const targetWhere: any = { organizationId };
  if (allowedStaffIds !== null) {
    targetWhere.employeeId = { in: allowedStaffIds };
  }
  if (staffId && staffId !== 'all') {
    targetWhere.employeeId = staffId;
  }
  if (type && type !== 'all') {
    targetWhere.type = type;
  }

  const targets = await prisma.target.findMany({
    where: targetWhere,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
          branchId: true,
          branch: { select: { id: true, name: true } }
        }
      },
      department: { select: { id: true, name: true } },
      center: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate real-time achievements from enrollments within the period
  const enrollmentsInPeriod = await prisma.enrollment.findMany({
    where: {
      organizationId,
      status: { notIn: ['rejected', 'department_rejected'] },
      OR: [
        { admissionDate: { gte: dateFrom, lte: dateTo } },
        { enrolledAt: { gte: dateFrom, lte: dateTo } },
        { createdAt: { gte: dateFrom, lte: dateTo } }
      ]
    },
    select: {
      id: true,
      salesUserId: true,
      studyCenterId: true,
      status: true,
      totalFee: true,
      studyCenter: { select: { referredBy: true } }
    }
  });

  // Aggregate achievements by staff & center
  const staffAdmissionsCount = new Map<string, number>();
  const staffRevenueSum = new Map<string, number>();
  const centerAdmissionsCount = new Map<string, number>();
  const centerRevenueSum = new Map<string, number>();

  for (const e of enrollmentsInPeriod) {
    const fee = Number(e.totalFee) || 0;
    const isEnrolled = e.status === 'enrolled';

    // Credit sales user or study center referrer
    const staffCredited = e.salesUserId || e.studyCenter?.referredBy;
    if (staffCredited) {
      if (isEnrolled) {
        staffAdmissionsCount.set(staffCredited, (staffAdmissionsCount.get(staffCredited) || 0) + 1);
      }
      staffRevenueSum.set(staffCredited, (staffRevenueSum.get(staffCredited) || 0) + fee);
    }

    if (e.studyCenterId) {
      if (isEnrolled) {
        centerAdmissionsCount.set(e.studyCenterId, (centerAdmissionsCount.get(e.studyCenterId) || 0) + 1);
      }
      centerRevenueSum.set(e.studyCenterId, (centerRevenueSum.get(e.studyCenterId) || 0) + fee);
    }
  }

  // Compile target items
  const compiledTargets = targets.map(t => {
    const isAdmission = t.type.toLowerCase().includes('admission');
    let realAchieved = 0;

    if (t.employeeId) {
      realAchieved = isAdmission
        ? (staffAdmissionsCount.get(t.employeeId) || 0)
        : (staffRevenueSum.get(t.employeeId) || 0);
    } else if (t.centerId) {
      realAchieved = isAdmission
        ? (centerAdmissionsCount.get(t.centerId) || 0)
        : (centerRevenueSum.get(t.centerId) || 0);
    }

    // Take max of real-time computed or explicitly recorded achieved
    const achievedValue = Math.max(realAchieved, Number(t.achieved) || 0);
    const targetValue = Number(t.target) || 0;
    const variance = achievedValue - targetValue;
    const percentage = targetValue > 0 ? Math.round((achievedValue / targetValue) * 100) : 0;

    let performanceStatus = 'critical';
    if (percentage >= 100) performanceStatus = 'exceeded';
    else if (percentage >= 70) performanceStatus = 'on_track';
    else if (percentage >= 40) performanceStatus = 'lagging';

    const emp = t.employee;
    const hierarchy = emp ? resolveChain(emp.id) : [];

    return {
      id: t.id,
      type: t.type,
      period: t.period,
      targetValue,
      achievedValue,
      recordedAchieved: Number(t.achieved) || 0,
      realtimeAchieved: realAchieved,
      variance,
      percentage,
      performanceStatus,
      status: t.status,
      deadline: t.deadline,
      incentive: t.incentive,
      employee: emp ? {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        designation: getUserTitle(userMap.get(emp.id) || emp) || 'Staff',
        branch: emp.branch?.name || 'N/A'
      } : null,
      reportingTL: hierarchy[0] || null,
      reportingManager: hierarchy[1] || hierarchy[0] || null,
      department: t.department ? { id: t.department.id, name: t.department.name } : null,
      center: t.center ? { id: t.center.id, name: t.center.name, code: t.center.code } : null
    };
  });

  // Apply filters
  let filtered = compiledTargets;
  if (branchId && branchId !== 'all') {
    filtered = filtered.filter(t => t.employee?.branch === branchId || t.center?.name.includes(branchId));
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(t => t.performanceStatus === status);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(t =>
      (t.employee?.name && t.employee.name.toLowerCase().includes(q)) ||
      (t.center?.name && t.center.name.toLowerCase().includes(q)) ||
      (t.reportingTL?.name && t.reportingTL.name.toLowerCase().includes(q)) ||
      t.type.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => b.percentage - a.percentage);

  // Overall KPI cards
  const totalTargetAdmissions = filtered.filter(t => t.type.toLowerCase().includes('admission')).reduce((acc, t) => acc + t.targetValue, 0);
  const totalAchievedAdmissions = filtered.filter(t => t.type.toLowerCase().includes('admission')).reduce((acc, t) => acc + t.achievedValue, 0);
  const totalTargetRevenue = filtered.filter(t => !t.type.toLowerCase().includes('admission')).reduce((acc, t) => acc + t.targetValue, 0);
  const totalAchievedRevenue = filtered.filter(t => !t.type.toLowerCase().includes('admission')).reduce((acc, t) => acc + t.achievedValue, 0);

  const overall = {
    totalTargetsCount: filtered.length,
    exceededCount: filtered.filter(t => t.performanceStatus === 'exceeded').length,
    onTrackCount: filtered.filter(t => t.performanceStatus === 'on_track').length,
    laggingCount: filtered.filter(t => t.performanceStatus === 'lagging' || t.performanceStatus === 'critical').length,
    totalTargetAdmissions,
    totalAchievedAdmissions,
    admissionAchievementRate: totalTargetAdmissions > 0 ? Math.round((totalAchievedAdmissions / totalTargetAdmissions) * 100) : 0,
    totalTargetRevenue,
    totalAchievedRevenue,
    revenueAchievementRate: totalTargetRevenue > 0 ? Math.round((totalAchievedRevenue / totalTargetRevenue) * 100) : 0
  };

  res.json({
    success: true,
    data: {
      targets: filtered,
      overall,
      filters: { year: targetYear, month: targetMonth, type, status, staffId, branchId }
    }
  });
});

// ============================================================================
// 3. Session Report: Session-Wise Report for BDEs, TLs, Asst BDMs, DMs & Branch Mgrs
// ============================================================================
export const getSessionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const isGlobalAuth = GLOBAL_AUTH_ROLES.includes(req.user.role);

  const { sessionId, status, search, branchId } = req.query as Record<string, string>;

  // 1. Fetch available admission sessions
  const availableSessions = await prisma.admissionSession.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Pick session
  let activeSession = null;
  if (sessionId && sessionId !== 'all') {
    activeSession = availableSessions.find(s => s.id === sessionId) || null;
  } else {
    activeSession = availableSessions.find(s => s.status === 'active') || availableSessions[0] || null;
  }

  if (!activeSession) {
    return res.json({
      success: true,
      data: {
        session: null,
        availableSessions,
        overview: { total: 0, completed: 0, pending: 0, rejected: 0, totalRevenue: 0, centersCount: 0, programsCount: 0 },
        byHierarchy: [],
        byCenter: [],
        byProgram: [],
        admissions: []
      }
    });
  }

  const { userMap, resolveChain, getSubordinateIds, getUserTitle } = await buildUserHierarchyMap(organizationId);

  // Scoping
  let allowedCenterIds: string[] | null = null;
  let allowedStaffIds: string[] | null = null;

  if (req.user.role === 'branch_manager') {
    const scope = await getBranchScope(req.user);
    allowedCenterIds = scope.centerIds;
    allowedStaffIds = scope.staffIds;
  } else if (!isGlobalAuth) {
    const subordinateIds = getSubordinateIds(req.user.id);
    allowedStaffIds = [req.user.id, ...subordinateIds];
  }

  // Enrollment query for the session
  const enrollmentWhere: any = {
    organizationId,
    sessionId: activeSession.id
  };

  if (status && status !== 'all') {
    enrollmentWhere.status = status;
  }

  if (allowedCenterIds !== null) {
    enrollmentWhere.studyCenterId = { in: allowedCenterIds };
  } else if (allowedStaffIds !== null) {
    enrollmentWhere.OR = [
      { salesUserId: { in: allowedStaffIds } },
      { studyCenter: { referredBy: { in: allowedStaffIds } } }
    ];
  }

  const enrollments = await prisma.enrollment.findMany({
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
          branchName: true,
          referredBy: true
        }
      },
      salesUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
          branch: { select: { id: true, name: true } }
        }
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Group by Staff (Hierarchy)
  const staffStatsMap = new Map<string, {
    staff: any;
    reportingTL: any;
    reportingManager: any;
    centersSet: Set<string>;
    total: number;
    completed: number;
    pending: number;
    rejected: number;
    revenue: number;
  }>();

  // Group by Study Center
  const centerStatsMap = new Map<string, {
    center: any;
    referrer: any;
    reportingTL: any;
    total: number;
    completed: number;
    pending: number;
    rejected: number;
    revenue: number;
    programCounts: Record<string, number>;
  }>();

  // Group by Program
  const programStatsMap = new Map<string, {
    universityName: string;
    programName: string;
    programCode: string;
    total: number;
    completed: number;
    revenue: number;
  }>();

  const formattedAdmissions: any[] = [];

  for (const e of enrollments) {
    const fee = Number(e.totalFee) || 0;
    const isEnrolled = e.status === 'enrolled';
    const isRejected = e.status === 'rejected' || e.status === 'department_rejected';
    const isPending = !isEnrolled && !isRejected;

    // Credit staff: salesUser or center referrer
    const staffId = e.salesUserId || e.studyCenter?.referredBy || 'unassigned';
    if (!staffStatsMap.has(staffId)) {
      const staffUser = userMap.get(staffId);
      const chain = resolveChain(staffId);
      staffStatsMap.set(staffId, {
        staff: staffUser ? {
          id: staffUser.id,
          name: staffUser.name,
          email: staffUser.email,
          role: staffUser.role,
          designation: getUserTitle(staffUser) || 'Staff',
          branch: staffUser.branch?.name || 'N/A'
        } : { id: 'unassigned', name: 'Direct / Unassigned', email: '', role: '', designation: '', branch: 'N/A' },
        reportingTL: chain[0] || null,
        reportingManager: chain[1] || chain[0] || null,
        centersSet: new Set(),
        total: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
        revenue: 0
      });
    }

    const staffStat = staffStatsMap.get(staffId)!;
    staffStat.total += 1;
    if (isEnrolled) staffStat.completed += 1;
    else if (isRejected) staffStat.rejected += 1;
    else staffStat.pending += 1;
    staffStat.revenue += fee;
    if (e.studyCenterId) staffStat.centersSet.add(e.studyCenterId);

    // Center Stat
    const centerId = e.studyCenterId || 'direct';
    if (!centerStatsMap.has(centerId)) {
      const c = e.studyCenter;
      const refUser = c?.referredBy ? userMap.get(c.referredBy) : null;
      const refChain = c?.referredBy ? resolveChain(c.referredBy) : [];
      centerStatsMap.set(centerId, {
        center: c ? {
          id: c.id,
          name: c.name,
          code: c.code,
          branchName: c.branchName || refUser?.branch?.name || 'N/A'
        } : { id: 'direct', name: 'Direct Admission', code: 'DIR', branchName: 'N/A' },
        referrer: refUser ? { id: refUser.id, name: refUser.name, designation: refUser.designation } : null,
        reportingTL: refChain[0] || null,
        total: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
        revenue: 0,
        programCounts: {}
      });
    }

    const centerStat = centerStatsMap.get(centerId)!;
    centerStat.total += 1;
    if (isEnrolled) centerStat.completed += 1;
    else if (isRejected) centerStat.rejected += 1;
    else centerStat.pending += 1;
    centerStat.revenue += fee;

    const progName = e.program?.name || 'Unknown Program';
    centerStat.programCounts[progName] = (centerStat.programCounts[progName] || 0) + 1;

    // Program Stat
    const progId = e.program?.id || 'unknown';
    if (!programStatsMap.has(progId)) {
      programStatsMap.set(progId, {
        universityName: e.program?.university?.name || 'N/A',
        programName: e.program?.name || 'N/A',
        programCode: e.program?.code || '',
        total: 0,
        completed: 0,
        revenue: 0
      });
    }

    const progStat = programStatsMap.get(progId)!;
    progStat.total += 1;
    if (isEnrolled) progStat.completed += 1;
    progStat.revenue += fee;

    // Formatted row
    formattedAdmissions.push({
      id: e.id,
      enrollmentNumber: e.enrollmentNumber || 'N/A',
      studentName: e.studentName || e.student?.name || 'N/A',
      studentEmail: e.studentEmail || e.student?.email || '',
      studentPhone: e.studentPhone || e.student?.phone || '',
      programName: e.program?.name || 'N/A',
      universityName: e.program?.university?.name || 'N/A',
      studyCenterName: e.studyCenter?.name || 'Direct',
      studyCenterCode: e.studyCenter?.code || '',
      branchName: e.studyCenter?.branchName || 'N/A',
      salesStaffName: staffStatsMap.get(staffId)?.staff.name || 'N/A',
      reportingTL: staffStatsMap.get(staffId)?.reportingTL?.name || 'N/A',
      status: e.status,
      admissionDate: e.admissionDate || e.enrolledAt || e.createdAt,
      totalFee: fee
    });
  }

  // Convert maps to sorted arrays
  const byHierarchy = Array.from(staffStatsMap.values()).map(s => ({
    staff: s.staff,
    reportingTL: s.reportingTL,
    reportingManager: s.reportingManager,
    centersCount: s.centersSet.size,
    total: s.total,
    completed: s.completed,
    pending: s.pending,
    rejected: s.rejected,
    revenue: s.revenue,
    conversionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
  })).sort((a, b) => b.completed - a.completed);

  const byCenter = Array.from(centerStatsMap.values()).map(c => {
    // Top program
    const topProg = Object.entries(c.programCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    return {
      center: c.center,
      referrer: c.referrer,
      reportingTL: c.reportingTL,
      total: c.total,
      completed: c.completed,
      pending: c.pending,
      rejected: c.rejected,
      revenue: c.revenue,
      topProgram: topProg,
      conversionRate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
    };
  }).sort((a, b) => b.completed - a.completed);

  const byProgram = Array.from(programStatsMap.values()).sort((a, b) => b.completed - a.completed);

  // Apply search filter on detailed admissions
  let filteredAdmissions = formattedAdmissions;
  if (search) {
    const q = search.trim().toLowerCase();
    filteredAdmissions = filteredAdmissions.filter(a =>
      a.studentName.toLowerCase().includes(q) ||
      a.enrollmentNumber.toLowerCase().includes(q) ||
      a.studyCenterName.toLowerCase().includes(q) ||
      a.programName.toLowerCase().includes(q) ||
      a.salesStaffName.toLowerCase().includes(q)
    );
  }

  // Overview metrics
  const overview = {
    sessionName: activeSession.name,
    total: enrollments.length,
    completed: enrollments.filter(e => e.status === 'enrolled').length,
    pending: enrollments.filter(e => !['enrolled', 'rejected', 'department_rejected'].includes(e.status)).length,
    rejected: enrollments.filter(e => ['rejected', 'department_rejected'].includes(e.status)).length,
    totalRevenue: enrollments.reduce((acc, e) => acc + (Number(e.totalFee) || 0), 0),
    centersCount: centerStatsMap.size,
    programsCount: programStatsMap.size,
    overallConversionRate: enrollments.length > 0
      ? Math.round((enrollments.filter(e => e.status === 'enrolled').length / enrollments.length) * 100)
      : 0
  };

  res.json({
    success: true,
    data: {
      session: activeSession,
      availableSessions,
      overview,
      byHierarchy,
      byCenter,
      byProgram,
      admissions: filteredAdmissions,
      filters: { sessionId: activeSession.id, status, branchId }
    }
  });
});
