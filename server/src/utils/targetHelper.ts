// @ts-nocheck
import prisma from '../lib/prisma.js';
import { getAllBranchesScope } from './branchScope.js';

export interface TargetDateRange {
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Parses target period into exact start and end dates.
 * Handles:
 * - 'YYYY-MM' (e.g. '2026-11')
 * - 'YYYY-QN' (e.g. '2026-Q1' .. '2026-Q4')
 * - 'YYYY' (e.g. '2026')
 * - 'session', 'all'
 * - 'monthly', 'weekly', 'quarterly', 'yearly'
 */
export function parseTargetPeriod(period: string | null | undefined, createdAt?: Date | string | null): TargetDateRange {
  const p = String(period || '').trim();
  if (p === 'session' || p === 'all') {
    return { dateFrom: new Date(0), dateTo: new Date(8640000000000000) };
  }

  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split('-').map(Number);
    const dateFrom = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  const qMatch = p.match(/^(\d{4})-Q([1-4])$/i);
  if (qMatch) {
    const y = Number(qMatch[1]);
    const q = Number(qMatch[2]) - 1;
    const dateFrom = new Date(Date.UTC(y, q * 3, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, (q + 1) * 3, 0, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  if (/^\d{4}$/.test(p)) {
    const y = Number(p);
    const dateFrom = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  const ref = createdAt ? new Date(createdAt) : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();

  if (p === 'weekly') {
    const day = ref.getDay();
    const dateFrom = new Date(ref);
    dateFrom.setDate(ref.getDate() - day);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateFrom.getDate() + 6);
    dateTo.setHours(23, 59, 59, 999);
    return { dateFrom, dateTo };
  }

  if (p === 'quarterly') {
    const q = Math.floor(m / 3);
    const dateFrom = new Date(Date.UTC(y, q * 3, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, (q + 1) * 3, 0, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  if (p === 'yearly') {
    const dateFrom = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  // Default: monthly for the target reference date
  const dateFrom = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const dateTo = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { dateFrom, dateTo };
}

/**
 * Calculates live achieved progress for targets based on active enrollments, revenue,
 * and onboarded study centers, and updates targets in memory and database asynchronously.
 */
export async function calculateAndSyncTargets(targets: any[], organizationId: string): Promise<any[]> {
  if (!targets || targets.length === 0) return [];

  const employeeIds = Array.from(new Set(targets.map(t => t.employeeId).filter(Boolean)));
  const departmentIds = Array.from(new Set(targets.map(t => t.departmentId).filter(Boolean)));

  const [allUsers, allDesignations, allBranches, allBranchesScope, allOrgCenters, allActiveEnrollments] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, designationId: true, branchId: true, departmentId: true, reportingTo: true, role: true }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true, branchId: true, departmentId: true }
    }),
    prisma.branch.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, branchManagerId: true }
    }),
    getAllBranchesScope(organizationId).catch(() => ({ branches: [], staffBranchMap: {} })),
    prisma.studyCenter.findMany({
      where: { organizationId },
      select: { id: true, referredBy: true, status: true, createdAt: true, updatedAt: true }
    }),
    prisma.enrollment.findMany({
      where: {
        organizationId,
        status: {
          notIn: ['rejected', 'department_rejected', 'ops_rejected', 'university_rejected', 'cancelled', 'dropout', 'refunded']
        }
      },
      select: {
        id: true,
        salesUserId: true,
        studyCenterId: true,
        sessionId: true,
        totalFee: true,
        status: true,
        admissionDate: true,
        enrolledAt: true,
        createdAt: true,
        student: { select: { referredBy: true } },
        program: { select: { id: true, universityId: true } }
      }
    })
  ]);

  const userMap = new Map<string, typeof allUsers[0]>();
  allUsers.forEach(u => userMap.set(u.id, u));

  // Map branchManagerId -> extra branch centerIds from branchScope
  const branchCentersByManager = new Map<string, Set<string>>();
  for (const b of (allBranchesScope?.branches || [])) {
    if (b.branchManagerId) {
      if (!branchCentersByManager.has(b.branchManagerId)) {
        branchCentersByManager.set(b.branchManagerId, new Set<string>());
      }
      const cSet = branchCentersByManager.get(b.branchManagerId)!;
      (b.centerIds || []).forEach((cId: string) => cSet.add(cId));
    }
  }

  // Map employeeId to all credited staff (employee + recursive subordinates + branch members)
  const employeeSubordinatesMap = new Map<string, string[]>();

  for (const empId of employeeIds) {
    const credited = new Set<string>([empId]);
    const empUser = userMap.get(empId);

    // 1. Recursive direct reportingTo downline
    const queue = [empId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const u of allUsers) {
        if (u.reportingTo === curr && !credited.has(u.id)) {
          credited.add(u.id);
          queue.push(u.id);
        }
      }
    }

    // 2. Branch manager scope: all users in branches managed by this employee
    const managedBranches = allBranches.filter(b => b.branchManagerId === empId);
    for (const mb of managedBranches) {
      for (const u of allUsers) {
        if (u.branchId === mb.id) {
          credited.add(u.id);
        }
      }
    }

    // 3. Recursive subordinate designations
    if (empUser?.designationId) {
      const childDesigIds = new Set<string>();
      const desigQueue = [empUser.designationId];
      while (desigQueue.length > 0) {
        const currDesig = desigQueue.shift()!;
        for (const d of allDesignations) {
          if (d.parentDesignationId === currDesig && !childDesigIds.has(d.id)) {
            childDesigIds.add(d.id);
            desigQueue.push(d.id);
          }
        }
      }

      if (childDesigIds.size > 0) {
        for (const u of allUsers) {
          if (u.designationId && childDesigIds.has(u.designationId)) {
            if (!empUser.branchId || !u.branchId || u.branchId === empUser.branchId) {
              credited.add(u.id);
            }
          }
        }
      }
    }

    employeeSubordinatesMap.set(empId, Array.from(credited));
  }

  // Pre-map department users if any target is department-scoped
  const deptStaffMap = new Map<string, string[]>();
  for (const dId of departmentIds) {
    const usersInDept = allUsers.filter(u => u.departmentId === dId).map(u => u.id);
    deptStaffMap.set(dId, usersInDept);
  }

  // Index all org centers by referrer
  const centersByStaff = new Map<string, string[]>();
  for (const c of allOrgCenters) {
    if (c.referredBy) {
      if (!centersByStaff.has(c.referredBy)) centersByStaff.set(c.referredBy, []);
      centersByStaff.get(c.referredBy)!.push(c.id);
    }
  }

  const REJECTED_CENTER_STATUSES = new Set(['rejected', 'ops_rejected', 'finance_rejected', 'cancelled', 'inactive']);
  const updatesToPersist: Array<{ id: string; achieved: number; status: string }> = [];

  const syncedTargets = targets.map(t => {
    const { dateFrom, dateTo } = parseTargetPeriod(t.period, t.createdAt);
    const fromTime = dateFrom.getTime();
    const toTime = dateTo.getTime();
    const isUnboundedPeriod = t.period === 'session' || t.period === 'all';

    const isOrgWide = !t.employeeId && !t.departmentId && !t.centerId;
    const creditedStaff: string[] = t.employeeId ? [...(employeeSubordinatesMap.get(t.employeeId) || [t.employeeId])] : [];
    const creditedCenters = new Set<string>();

    if (t.centerId) creditedCenters.add(t.centerId);

    // Add branch centers if target employee is a branch manager
    if (t.employeeId && branchCentersByManager.has(t.employeeId)) {
      branchCentersByManager.get(t.employeeId)!.forEach(cId => creditedCenters.add(cId));
    }

    // Add centers referred by any credited staff
    for (const sId of creditedStaff) {
      const cList = centersByStaff.get(sId) || [];
      cList.forEach(cId => creditedCenters.add(cId));
    }

    // Add department staff and their centers if target is department-scoped (and not narrowed to one employee)
    if (!t.employeeId && t.departmentId && deptStaffMap.has(t.departmentId)) {
      const dStaff = deptStaffMap.get(t.departmentId) || [];
      dStaff.forEach(sId => {
        creditedStaff.push(sId);
        const cList = centersByStaff.get(sId) || [];
        cList.forEach(cId => creditedCenters.add(cId));
      });
    }

    const staffSet = new Set(creditedStaff);
    const isCenters = /center/i.test(t.type || '');
    const isRevenue = /revenue|fee|amount|sales/i.test(t.type || '');

    let realAchieved = 0;

    if (isCenters) {
      const matchingCenters = allOrgCenters.filter(c => {
        if (REJECTED_CENTER_STATUSES.has(String(c.status || '').toLowerCase())) return false;
        const matchesAttribution = isOrgWide ||
          (c.referredBy && staffSet.has(c.referredBy)) ||
          creditedCenters.has(c.id);
        if (!matchesAttribution) return false;
        if (isUnboundedPeriod) return true;
        const cTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        return cTime >= fromTime && cTime <= toTime;
      });
      realAchieved = matchingCenters.length;
    } else {
      const matchingEnrollments = allActiveEnrollments.filter(e => {
        if (t.universityId && e.program?.universityId !== t.universityId) return false;
        if (t.sessionId && e.sessionId !== t.sessionId) return false;

        if (!isOrgWide) {
          const matchesAttribution =
            (e.salesUserId && staffSet.has(e.salesUserId)) ||
            (e.student?.referredBy && staffSet.has(e.student.referredBy)) ||
            (e.studyCenterId && creditedCenters.has(e.studyCenterId));
          if (!matchesAttribution) return false;
        }

        if (t.sessionId && isUnboundedPeriod) {
          return true;
        }
        if (isUnboundedPeriod) {
          return true;
        }

        // Canonical single admission date prevents cross-month double-counting
        const rawDate = e.admissionDate || e.enrolledAt || e.createdAt;
        if (!rawDate) return false;
        const tTime = new Date(rawDate).getTime();
        return !isNaN(tTime) && tTime >= fromTime && tTime <= toTime;
      });

      if (isRevenue) {
        realAchieved = matchingEnrollments.reduce((sum, e) => sum + (Number(e.totalFee) || 0), 0);
      } else {
        realAchieved = matchingEnrollments.length;
      }
    }

    const finalAchieved = realAchieved;

    const now = new Date();
    const isCompleted = Number(finalAchieved) >= Number(t.target) && Number(t.target) > 0;
    const isPastDeadline = t.deadline
      ? now.getTime() > new Date(t.deadline).getTime()
      : (!isUnboundedPeriod && now.getTime() > toTime);

    let computedStatus = 'active';
    if (isCompleted) {
      computedStatus = 'completed';
    } else if (isPastDeadline) {
      computedStatus = 'failed';
    }

    if (t.id && (finalAchieved !== Number(t.achieved) || computedStatus !== t.status)) {
      updatesToPersist.push({ id: t.id, achieved: finalAchieved, status: computedStatus });
    }

    return {
      ...t,
      achieved: finalAchieved,
      realtimeAchieved: realAchieved,
      status: computedStatus,
      computedStatus
    };
  });

  if (updatesToPersist.length > 0) {
    Promise.allSettled(
      updatesToPersist.map(u =>
        prisma.target.update({
          where: { id: u.id },
          data: { achieved: u.achieved, status: u.status }
        })
      )
    ).catch(err => console.error('[calculateAndSyncTargets] Error syncing targets to DB:', err));
  }

  return syncedTargets;
}

export interface TargetFilterOptions {
  status?: string; // 'all' | 'active' | 'completed' | 'failed'
  sessionId?: string;
  year?: string;
  month?: string;
  userId?: string;
  universityId?: string;
}

export function filterTargets(targets: any[], filters?: TargetFilterOptions): any[] {
  if (!filters) return targets;
  return targets.filter(t => {
    if (filters.status && filters.status !== 'all') {
      const s = (t.computedStatus || t.status || '').toLowerCase();
      if (filters.status === 'completed' && s !== 'completed' && s !== 'achieved') return false;
      if (filters.status === 'failed' && s !== 'failed') return false;
      if (filters.status === 'active' && s !== 'active' && s !== 'pending') return false;
    }

    if (filters.userId && filters.userId !== 'all') {
      const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?._id) : (t.employee?.id || t.employeeId);
      if (empId !== filters.userId) return false;
    }

    if (filters.universityId && filters.universityId !== 'all') {
      const uId = typeof t.universityId === 'object' ? (t.universityId?.id || t.universityId?._id) : (t.university?.id || t.universityId);
      if (uId !== filters.universityId) return false;
    }

    if (filters.sessionId && filters.sessionId !== 'all') {
      const sId = typeof t.sessionId === 'object' ? (t.sessionId?.id || t.sessionId?._id) : (t.session?.id || t.sessionId);
      if (sId !== filters.sessionId) return false;
    }

    const periodStr = String(t.period || '').trim();
    const hasExplicitYear = /^\d{4}/.test(periodStr);

    if (filters.year && filters.year !== 'all') {
      if (hasExplicitYear) {
        if (periodStr.slice(0, 4) !== String(filters.year)) return false;
      } else if (periodStr !== 'session' && periodStr !== 'all') {
        const createdYear = t.createdAt ? new Date(t.createdAt).getFullYear().toString() : '';
        if (createdYear && createdYear !== String(filters.year)) return false;
      }
    }

    if (filters.month && filters.month !== 'all') {
      const paddedMonth = String(filters.month).padStart(2, '0');
      const mNum = Number(paddedMonth);
      if (/^\d{4}-\d{2}/.test(periodStr)) {
        if (periodStr.slice(5, 7) !== paddedMonth) return false;
      } else if (/^\d{4}-Q([1-4])$/i.test(periodStr)) {
        const q = Number(periodStr.match(/Q([1-4])$/i)![1]);
        const startM = (q - 1) * 3 + 1;
        const endM = q * 3;
        if (mNum < startM || mNum > endM) return false;
      } else if (periodStr === 'monthly' || periodStr === 'weekly') {
        const createdMonth = t.createdAt ? String(new Date(t.createdAt).getMonth() + 1).padStart(2, '0') : '';
        if (createdMonth && createdMonth !== paddedMonth) return false;
      }
    }

    return true;
  });
}
