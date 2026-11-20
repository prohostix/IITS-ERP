// @ts-nocheck
import type { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Branch Manager scoping helpers.
 *
 * A Branch Manager owns everything in a single branch:
 *  - Staff: users whose branchId is the branch, or who belong to the branch's
 *    Sales / Operations / additional departments (or their sub-departments).
 *  - Study centers: centers referred by branch staff, created from an invite
 *    link issued for the branch, or tagged with the branch's name.
 *  - Students / enrollments / leads / targets that hang off the above.
 */

const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'project_manager'];

/**
 * Normalises a user loaded with `managedBranch` so anyone assigned as a branch's
 * manager is treated as a `branch_manager` scoped to that branch. Covers managers
 * assigned before the role was set automatically. Org-wide roles are left alone.
 */
export function applyBranchManagerRole<T extends Record<string, any>>(user: T | null): T | null {
  if (!user) return user;
  const managed = (user as any).managedBranch;
  if (managed?.id && !GLOBAL_ROLES.includes((user as any).role)) {
    (user as any).role = 'branch_manager';
    (user as any).branchId = managed.id;
  }
  if (!(user as any).branchId && (user as any).designationRef?.branchId) {
    (user as any).branchId = (user as any).designationRef.branchId;
  }
  return user;
}

export const isBranchManager = (user: any): boolean => user?.role === 'branch_manager';

export interface BranchScope {
  branchId: string | null;
  branchName: string | null;
  deptIds: string[];
  staffIds: string[];
  centerIds: string[];
}

/**
 * Resolves (and caches on req.user) the set of staff and study centers that a
 * Branch Manager may see and act on.
 */
export async function getBranchScope(user: any): Promise<BranchScope> {
  if (user._branchScope) return user._branchScope;

  const empty: BranchScope = { branchId: null, branchName: null, deptIds: [], staffIds: [user.id], centerIds: [] };

  let branch = null;
  if (user.branchId) {
    branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
      include: { additionalDepts: { select: { id: true } } }
    });
  }
  if (!branch) {
    branch = await prisma.branch.findFirst({
      where: { branchManagerId: user.id },
      include: { additionalDepts: { select: { id: true } } }
    });
  }
  if (!branch || branch.organizationId !== user.organizationId) {
    user._branchScope = empty;
    return empty;
  }

  const deptIds = [
    branch.salesDeptId,
    branch.operationsDeptId,
    ...(branch.additionalDepts || []).map((d: any) => d.id)
  ].filter(Boolean) as string[];

  const staff = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [
        { branchId: branch.id },
        { designationRef: { branchId: branch.id } },
        { reportingTo: user.id },
        ...(deptIds.length > 0 ? [
          { departmentId: { in: deptIds } },
          { subDepartment: { parentDeptId: { in: deptIds } } },
          { designationRef: { departmentId: { in: deptIds } } },
          { designationRef: { subDepartment: { parentDeptId: { in: deptIds } } } }
        ] : [])
      ]
    },
    select: { id: true, designationId: true }
  });
  const staffIdSet = new Set<string>([user.id, ...staff.map(s => s.id)]);

  // Also include any transitive subordinates reporting to branch staff or in child designations
  const [allOrgUsers, allOrgDesignations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId, status: { not: 'deleted' } },
      select: { id: true, reportingTo: true, designationId: true, branchId: true }
    }),
    prisma.designation.findMany({
      where: { organizationId: user.organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true, branchId: true }
    })
  ]);

  const desigFrontier: string[] = [];
  if (user.designationId) desigFrontier.push(user.designationId);
  for (const s of staff) {
    if (s.designationId) desigFrontier.push(s.designationId);
  }
  for (const d of allOrgDesignations) {
    if (d.branchId === branch.id) desigFrontier.push(d.id);
  }
  const branchDesigIds = new Set<string>(desigFrontier);
  const dq = [...desigFrontier];
  while (dq.length > 0) {
    const cd = dq.shift()!;
    for (const d of allOrgDesignations) {
      if (d.parentDesignationId === cd && !branchDesigIds.has(d.id)) {
        branchDesigIds.add(d.id);
        dq.push(d.id);
      }
    }
  }
  for (const u of allOrgUsers) {
    if (u.designationId && branchDesigIds.has(u.designationId)) {
      if (!u.branchId || u.branchId === branch.id) {
        staffIdSet.add(u.id);
      }
    }
  }

  const rq = Array.from(staffIdSet);
  while (rq.length > 0) {
    const curr = rq.shift()!;
    for (const u of allOrgUsers) {
      if (u.reportingTo === curr && !staffIdSet.has(u.id)) {
        staffIdSet.add(u.id);
        rq.push(u.id);
      }
    }
  }

  const staffIds = Array.from(staffIdSet);

  const branchInvites = await prisma.studyCenterInvite.findMany({
    where: { organizationId: user.organizationId, branchId: branch.id },
    select: { token: true }
  });
  const inviteTokens = branchInvites.map(i => i.token);

  const centers = await prisma.studyCenter.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [
        { referredBy: { in: staffIds } },
        ...(inviteTokens.length > 0 ? [{ inviteToken: { in: inviteTokens } }] : []),
        { branchName: { equals: branch.name, mode: 'insensitive' } }
      ]
    },
    select: { id: true }
  });

  const scope: BranchScope = {
    branchId: branch.id,
    branchName: branch.name,
    deptIds,
    staffIds,
    centerIds: centers.map(c => c.id)
  };
  user._branchScope = scope;
  return scope;
}

/** Clears the cached scope (e.g. after creating a new center in the same request). */
export function resetBranchScope(user: any) {
  if (user) delete user._branchScope;
}

/**
 * Resolves the BranchScope (deptIds, staffIds, centerIds) for any specific branchId (or branch name)
 * within an organization. Used by Project Manager / Operations Admin / CEO branch filtering.
 */
export async function getBranchScopeByBranchId(organizationId: string, branchIdOrName: string): Promise<BranchScope> {
  const empty: BranchScope = { branchId: null, branchName: null, deptIds: [], staffIds: [], centerIds: [] };
  if (!organizationId || !branchIdOrName || branchIdOrName === 'all') return empty;

  const branch = await prisma.branch.findFirst({
    where: {
      organizationId,
      OR: [
        { id: branchIdOrName },
        { name: { equals: branchIdOrName, mode: 'insensitive' } }
      ]
    },
    include: { additionalDepts: { select: { id: true } } }
  });

  if (!branch) return empty;

  const deptIds = [
    branch.salesDeptId,
    branch.operationsDeptId,
    ...(branch.additionalDepts || []).map((d: any) => d.id)
  ].filter(Boolean) as string[];

  const orClauses: any[] = [
    { branchId: branch.id },
    { designationRef: { branchId: branch.id } },
  ];
  if (branch.branchManagerId) {
    orClauses.push({ id: branch.branchManagerId });
    orClauses.push({ reportingTo: branch.branchManagerId });
  }
  if (deptIds.length > 0) {
    orClauses.push(
      { departmentId: { in: deptIds } },
      { subDepartment: { parentDeptId: { in: deptIds } } },
      { designationRef: { departmentId: { in: deptIds } } },
      { designationRef: { subDepartment: { parentDeptId: { in: deptIds } } } }
    );
  }

  const staff = await prisma.user.findMany({
    where: {
      organizationId,
      OR: orClauses
    },
    select: { id: true }
  });
  const staffIdSet = new Set<string>(staff.map(s => s.id));
  if (branch.branchManagerId) staffIdSet.add(branch.branchManagerId);

  let frontier = Array.from(staffIdSet);
  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const subs = await prisma.user.findMany({
      where: {
        organizationId,
        reportingTo: { in: frontier }
      },
      select: { id: true }
    });
    const nextFrontier: string[] = [];
    for (const s of subs) {
      if (!staffIdSet.has(s.id)) {
        staffIdSet.add(s.id);
        nextFrontier.push(s.id);
      }
    }
    frontier = nextFrontier;
  }

  const staffIds = Array.from(staffIdSet);

  const branchInvites = await prisma.studyCenterInvite.findMany({
    where: { organizationId, branchId: branch.id },
    select: { token: true }
  });
  const inviteTokens = branchInvites.map(i => i.token);

  const centerOr: any[] = [
    { branchName: { equals: branch.name, mode: 'insensitive' } }
  ];
  if (staffIds.length > 0) {
    centerOr.push({ referredBy: { in: staffIds } });
  }
  if (inviteTokens.length > 0) {
    centerOr.push({ inviteToken: { in: inviteTokens } });
  }

  const centers = await prisma.studyCenter.findMany({
    where: {
      organizationId,
      OR: centerOr
    },
    select: { id: true }
  });

  return {
    branchId: branch.id,
    branchName: branch.name,
    deptIds,
    staffIds,
    centerIds: centers.map(c => c.id)
  };
}

/**
 * Resolves all branches in an organization along with their centerIds, staffIds,
 * and lookup maps (centerId -> branch, staffId -> branch).
 */
export async function getAllBranchesScope(organizationId: string) {
  const branches = await prisma.branch.findMany({
    where: { organizationId },
    include: { additionalDepts: { select: { id: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const centerBranchMap: Record<string, { branchId: string; branchName: string }> = {};
  const staffBranchMap: Record<string, { branchId: string; branchName: string }> = {};
  const branchScopes: Record<string, BranchScope> = {};

  for (const b of branches) {
    const scope = await getBranchScopeByBranchId(organizationId, b.id);
    branchScopes[b.id] = scope;
    for (const sId of scope.staffIds) {
      if (!staffBranchMap[sId]) {
        staffBranchMap[sId] = { branchId: b.id, branchName: b.name };
      }
    }
    for (const cId of scope.centerIds) {
      if (!centerBranchMap[cId]) {
        centerBranchMap[cId] = { branchId: b.id, branchName: b.name };
      }
    }
  }

  return { branches, branchScopes, centerBranchMap, staffBranchMap };
}

/**
 * Route guard: when the caller is a Branch Manager, ensure the study center in
 * `req.params[param]` belongs to their branch. Other roles pass straight through.
 */
export const requireCenterInBranch = (param = 'id') =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!isBranchManager(req.user)) return next();
    const scope = await getBranchScope(req.user);
    if (!scope.centerIds.includes(req.params[param])) {
      res.status(403).json({ success: false, message: 'This study center is not in your branch' });
      return;
    }
    next();
  };

/**
 * Route guard: when the caller is a Branch Manager, ensure the enrollment in
 * `req.params[param]` belongs to a study center in their branch.
 */
export const requireEnrollmentInBranch = (param = 'id') =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!isBranchManager(req.user)) return next();
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params[param] },
      select: { studyCenterId: true }
    });
    const scope = await getBranchScope(req.user);
    if (!enrollment || !scope.centerIds.includes(enrollment.studyCenterId)) {
      res.status(403).json({ success: false, message: 'This enrollment is not in your branch' });
      return;
    }
    next();
  };
