// @ts-nocheck
import prisma from '../lib/prisma.js';

export interface TargetDateRange {
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Parses target period into exact start and end dates.
 * Handles:
 * - 'YYYY-MM' (e.g. '2026-11')
 * - 'YYYY' (e.g. '2026')
 * - 'monthly', 'weekly', 'quarterly', 'yearly'
 */
export function parseTargetPeriod(period: string | null | undefined, createdAt?: Date | string | null): TargetDateRange {
  if (typeof period === 'string' && /^\d{4}-\d{2}$/.test(period.trim())) {
    const [y, m] = period.trim().split('-').map(Number);
    const dateFrom = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  if (typeof period === 'string' && /^\d{4}$/.test(period.trim())) {
    const y = Number(period.trim());
    const dateFrom = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  const ref = createdAt ? new Date(createdAt) : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();

  if (period === 'weekly') {
    const day = ref.getDay();
    const dateFrom = new Date(ref);
    dateFrom.setDate(ref.getDate() - day);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateFrom.getDate() + 6);
    dateTo.setHours(23, 59, 59, 999);
    return { dateFrom, dateTo };
  }

  if (period === 'quarterly') {
    const q = Math.floor(m / 3);
    const dateFrom = new Date(Date.UTC(y, q * 3, 1, 0, 0, 0, 0));
    const dateTo = new Date(Date.UTC(y, (q + 1) * 3, 0, 23, 59, 59, 999));
    return { dateFrom, dateTo };
  }

  if (period === 'yearly') {
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
 * Calculates live achieved progress for targets based on completed enrollments/revenue,
 * and updates targets in memory and database asynchronously.
 */
export async function calculateAndSyncTargets(targets: any[], organizationId: string): Promise<any[]> {
  if (!targets || targets.length === 0) return [];

  // Gather unique employee IDs to query subordinates and centers
  const employeeIds = Array.from(new Set(targets.map(t => t.employeeId).filter(Boolean)));
  const centerIdsDirect = Array.from(new Set(targets.map(t => t.centerId).filter(Boolean)));

  // Load all designations for organization to resolve subordinate downline
  const [allUsers, allDesignations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, designationId: true, branchId: true, reportingTo: true }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true }
    })
  ]);

  const userMap = new Map<string, typeof allUsers[0]>();
  allUsers.forEach(u => userMap.set(u.id, u));

  // Map employeeId to all credited staff (the employee + any subordinates)
  const employeeSubordinatesMap = new Map<string, string[]>();

  for (const empId of employeeIds) {
    const credited = new Set<string>([empId]);
    const empUser = userMap.get(empId);

    // Direct reporting
    allUsers.forEach(u => {
      if (u.reportingTo === empId) credited.add(u.id);
    });

    // Subordinate designations
    if (empUser?.designationId) {
      const childDesigIds = new Set<string>();
      const queue = [empUser.designationId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const d of allDesignations) {
          if (d.parentDesignationId === curr && !childDesigIds.has(d.id)) {
            childDesigIds.add(d.id);
            queue.push(d.id);
          }
        }
      }

      if (childDesigIds.size > 0) {
        allUsers.forEach(u => {
          if (u.designationId && childDesigIds.has(u.designationId)) {
            credited.add(u.id);
          }
        });
      }
    }

    employeeSubordinatesMap.set(empId, Array.from(credited));
  }

  // Fetch all study centers referred by any of these credited staff
  const allCreditedStaff = Array.from(new Set(Array.from(employeeSubordinatesMap.values()).flat()));
  const allReferredCenters = await prisma.studyCenter.findMany({
    where: {
      organizationId,
      referredBy: { in: allCreditedStaff }
    },
    select: { id: true, referredBy: true }
  });

  const centersByStaff = new Map<string, string[]>();
  for (const c of allReferredCenters) {
    if (c.referredBy) {
      if (!centersByStaff.has(c.referredBy)) centersByStaff.set(c.referredBy, []);
      centersByStaff.get(c.referredBy)!.push(c.id);
    }
  }

  // Pre-fetch all enrolled enrollments in organization (with dates, session, program university)
  const allCompletedEnrollments = await prisma.enrollment.findMany({
    where: {
      organizationId,
      status: 'enrolled'
    },
    select: {
      id: true,
      salesUserId: true,
      studyCenterId: true,
      sessionId: true,
      totalFee: true,
      admissionDate: true,
      enrolledAt: true,
      createdAt: true,
      program: {
        select: {
          id: true,
          universityId: true
        }
      }
    }
  });

  // Calculate live achievements for each target
  const updatesToPersist: Array<{ id: string; achieved: number; status: string }> = [];

  const syncedTargets = targets.map(t => {
    const { dateFrom, dateTo } = parseTargetPeriod(t.period, t.createdAt);
    const fromTime = dateFrom.getTime();
    const toTime = dateTo.getTime();

    // Identify credited staff and centers for this target
    const creditedStaff = t.employeeId ? (employeeSubordinatesMap.get(t.employeeId) || [t.employeeId]) : [];
    const creditedCenters = new Set<string>();

    if (t.centerId) creditedCenters.add(t.centerId);

    // Add centers referred by any credited staff
    for (const sId of creditedStaff) {
      const cList = centersByStaff.get(sId) || [];
      cList.forEach(cId => creditedCenters.add(cId));
    }

    const staffSet = new Set(creditedStaff);

    // Filter enrollments matching date, attribution, university, and session
    const matchingEnrollments = allCompletedEnrollments.filter(e => {
      // University specific target check
      if (t.universityId && e.program?.universityId !== t.universityId) return false;

      // Session specific target check
      if (t.sessionId && e.sessionId !== t.sessionId) return false;

      const d = e.admissionDate || e.enrolledAt || e.createdAt;
      if (!d) return false;
      const tTime = new Date(d).getTime();
      if (tTime < fromTime || tTime > toTime) return false;

      // Attribution match
      if (e.salesUserId && staffSet.has(e.salesUserId)) return true;
      if (e.studyCenterId && creditedCenters.has(e.studyCenterId)) return true;
      return false;
    });

    const isAdmissionOrStudent = /student|admission/i.test(t.type || '');
    const isRevenue = /revenue|fee|amount|sales/i.test(t.type || '');

    let realAchieved = 0;
    if (isAdmissionOrStudent) {
      realAchieved = matchingEnrollments.length;
    } else if (isRevenue) {
      realAchieved = matchingEnrollments.reduce((sum, e) => sum + (Number(e.totalFee) || 0), 0);
    } else {
      realAchieved = matchingEnrollments.length;
    }

    // Never decrease recorded manual value if explicitly set higher
    const finalAchieved = Math.max(realAchieved, Number(t.achieved) || 0);

    // Compute status: 'completed' (achieved >= target), 'failed' (past deadline/period and not achieved), or 'active'
    const now = new Date();
    const isCompleted = Number(finalAchieved) >= Number(t.target) && Number(t.target) > 0;
    const isPastDeadline = t.deadline ? now.getTime() > new Date(t.deadline).getTime() : now.getTime() > toTime;

    let computedStatus = 'active';
    if (isCompleted) {
      computedStatus = 'completed';
    } else if (isPastDeadline) {
      computedStatus = 'failed';
    } else {
      computedStatus = 'active';
    }

    // Check if DB needs to be updated
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

  // Asynchronously persist any updated achieved & status values in DB without blocking
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
    // 1. Status filter
    if (filters.status && filters.status !== 'all') {
      const s = (t.status || t.computedStatus || '').toLowerCase();
      if (filters.status === 'completed' && s !== 'completed' && s !== 'achieved') return false;
      if (filters.status === 'failed' && s !== 'failed') return false;
      if (filters.status === 'active' && s !== 'active' && s !== 'pending') return false;
    }

    // 2. User / Employee filter
    if (filters.userId && filters.userId !== 'all') {
      const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?._id) : (t.employee?.id || t.employeeId);
      if (empId !== filters.userId) return false;
    }

    // 3. University filter
    if (filters.universityId && filters.universityId !== 'all') {
      const uId = typeof t.universityId === 'object' ? (t.universityId?.id || t.universityId?._id) : (t.university?.id || t.universityId);
      if (uId !== filters.universityId) return false;
    }

    // 4. Session filter
    if (filters.sessionId && filters.sessionId !== 'all') {
      const sId = typeof t.sessionId === 'object' ? (t.sessionId?.id || t.sessionId?._id) : (t.session?.id || t.sessionId);
      if (sId !== filters.sessionId) return false;
    }

    // 5. Year and Month filter on period
    const periodStr = String(t.period || '').trim();
    if (filters.year && filters.year !== 'all') {
      const targetYear = periodStr.slice(0, 4);
      const createdYear = t.createdAt ? new Date(t.createdAt).getFullYear().toString() : '';
      if (targetYear !== filters.year && createdYear !== filters.year) return false;
    }

    if (filters.month && filters.month !== 'all') {
      const paddedMonth = filters.month.padStart(2, '0');
      let targetMonth = '';
      if (/^\d{4}-\d{2}/.test(periodStr)) {
        targetMonth = periodStr.slice(5, 7);
      } else if (t.createdAt) {
        targetMonth = String(new Date(t.createdAt).getMonth() + 1).padStart(2, '0');
      }
      if (targetMonth && targetMonth !== paddedMonth) return false;
    }

    return true;
  });
}
