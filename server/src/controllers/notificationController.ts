// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getBranchScope } from '../utils/branchScope.js';

const STUDENT_CENTER_NOTIF_REGEX =
  /status change request|status request|enrollment|enrolled|student application|application verified|application rejected|fee advance|fee refund|study center/i;

/**
 * Resolves the sales staff member who referred a study center (or owns an enrollment)
 * AND their entire upward reporting hierarchy (Team Leader, Assistant BDM, BDM, Branch Manager).
 */
export async function getSalesChainForCenterOrEnrollment(
  organizationId: string,
  options: { studyCenterId?: string | null; salesUserId?: string | null }
): Promise<string[]> {
  const seedIds = new Set<string>();
  if (options.salesUserId) seedIds.add(options.salesUserId);

  if (options.studyCenterId) {
    const center = await prisma.studyCenter.findUnique({
      where: { id: options.studyCenterId },
      select: { referredBy: true }
    });
    if (center?.referredBy) seedIds.add(center.referredBy);
  }

  if (seedIds.size === 0) return [];

  const [allUsers, allDesignations, allBranches] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, reportingTo: true, designationId: true, branchId: true, departmentId: true }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true, branchId: true, departmentId: true }
    }),
    prisma.branch.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, branchManagerId: true }
    })
  ]);

  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const desigMap = new Map(allDesignations.map(d => [d.id, d]));
  const branchMap = new Map(allBranches.map(b => [b.id, b]));

  const recipients = new Set<string>();

  for (const seedId of seedIds) {
    if (!userMap.has(seedId)) continue;
    recipients.add(seedId);
    const seedUser = userMap.get(seedId)!;

    // 1. Direct reportingTo chain upwards
    let currId = seedUser.reportingTo;
    let depth = 0;
    while (currId && userMap.has(currId) && depth < 8) {
      recipients.add(currId);
      currId = userMap.get(currId)!.reportingTo;
      depth++;
    }

    // 2. Designation hierarchy upwards within the same branch/department
    let currDesigId = seedUser.designationId ? desigMap.get(seedUser.designationId)?.parentDesignationId : null;
    let dDepth = 0;
    while (currDesigId && desigMap.has(currDesigId) && dDepth < 8) {
      for (const u of allUsers) {
        if (u.designationId === currDesigId) {
          if (!seedUser.branchId || !u.branchId || u.branchId === seedUser.branchId) {
            recipients.add(u.id);
          }
        }
      }
      currDesigId = desigMap.get(currDesigId)!.parentDesignationId;
      dDepth++;
    }

    // 3. Branch manager of the user's branch
    if (seedUser.branchId && branchMap.has(seedUser.branchId)) {
      const bmId = branchMap.get(seedUser.branchId)!.branchManagerId;
      if (bmId) recipients.add(bmId);
    }
  }

  return Array.from(recipients);
}

/**
 * Resolves the downline team, study centers, and student names belonging to a user.
 */
async function getUserTeamAndCenterScope(user: any, organizationId: string) {
  if (user.role === 'center_admin') {
    const centerId = user.studyCenterId;
    if (!centerId) return { centerNames: [], studentNames: [] };
    const [center, enrollments, students] = await Promise.all([
      prisma.studyCenter.findUnique({ where: { id: centerId }, select: { name: true } }),
      prisma.enrollment.findMany({ where: { studyCenterId: centerId }, select: { studentName: true } }),
      prisma.student.findMany({ where: { centerId }, select: { name: true } })
    ]);
    return {
      centerNames: center?.name ? [center.name.trim().toLowerCase()] : [],
      studentNames: Array.from(
        new Set([
          ...enrollments.map(e => (e.studentName || '').trim().toLowerCase()),
          ...students.map(s => (s.name || '').trim().toLowerCase())
        ].filter(Boolean))
      )
    };
  }

  let teamUserIds: string[] = [user.id];
  let centerIds: string[] = [];

  if (user.role === 'branch_manager') {
    const scope = await getBranchScope(user);
    teamUserIds = Array.from(new Set([user.id, ...scope.staffIds]));
    centerIds = scope.centerIds;
  } else {
    const [allUsers, allDesignations] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId, status: { not: 'deleted' } },
        select: { id: true, reportingTo: true, designationId: true, branchId: true }
      }),
      prisma.designation.findMany({
        where: { organizationId, status: { not: 'deleted' } },
        select: { id: true, parentDesignationId: true }
      })
    ]);

    const subIds = new Set<string>([user.id]);
    const queue = [user.id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const u of allUsers) {
        if (u.reportingTo === curr && !subIds.has(u.id)) {
          subIds.add(u.id);
          queue.push(u.id);
        }
      }
    }

    if (user.designationId) {
      const childDesigIds = new Set<string>();
      const dq = [user.designationId];
      while (dq.length > 0) {
        const cd = dq.shift()!;
        for (const d of allDesignations) {
          if (d.parentDesignationId === cd && !childDesigIds.has(d.id)) {
            childDesigIds.add(d.id);
            dq.push(d.id);
          }
        }
      }
      for (const u of allUsers) {
        if (u.designationId && childDesigIds.has(u.designationId)) {
          if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
            subIds.add(u.id);
          }
        }
      }
    }

    teamUserIds = Array.from(subIds);
  }

  const centers = await prisma.studyCenter.findMany({
    where: {
      organizationId,
      ...(centerIds.length > 0
        ? { OR: [{ id: { in: centerIds } }, { referredBy: { in: teamUserIds } }] }
        : { referredBy: { in: teamUserIds } })
    },
    select: { id: true, name: true }
  });

  const allCenterIds = centers.map(c => c.id);
  const centerNames = centers.map(c => (c.name || '').trim().toLowerCase()).filter(Boolean);

  const [enrollments, students] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        organizationId,
        OR: [
          ...(allCenterIds.length > 0 ? [{ studyCenterId: { in: allCenterIds } }] : []),
          { salesUserId: { in: teamUserIds } }
        ]
      },
      select: { studentName: true }
    }),
    allCenterIds.length > 0
      ? prisma.student.findMany({
          where: { organizationId, centerId: { in: allCenterIds } },
          select: { name: true }
        })
      : Promise.resolve([])
  ]);

  const studentNames = Array.from(
    new Set([
      ...enrollments.map(e => (e.studentName || '').trim().toLowerCase()),
      ...students.map(s => (s.name || '').trim().toLowerCase())
    ].filter(Boolean))
  );

  return { centerNames, studentNames };
}

export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  const [notifications, fullUser] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        branchId: true,
        designationId: true,
        studyCenterId: true,
        department: { select: { type: true } }
      }
    })
  ]);

  const role = fullUser?.role || req.user.role;
  const deptType = fullUser?.department?.type || '';

  const isGlobalOrOpsOrFinance =
    ['superadmin', 'org_admin', 'ceo', 'general_manager', 'project_manager', 'ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance'].includes(role) ||
    deptType === 'operations' ||
    deptType === 'finance';

  let filtered = notifications;

  if (!isGlobalOrOpsOrFinance) {
    const isSalesOrCenterOrBranch =
      ['sales', 'sales_admin', 'sales_sub_admin', 'bde', 'bda', 'team_leader', 'counselor', 'branch_manager', 'center_admin'].includes(role) ||
      deptType === 'sales';

    if (isSalesOrCenterOrBranch) {
      const { centerNames, studentNames } = await getUserTeamAndCenterScope(fullUser || req.user, organizationId);
      filtered = notifications.filter(n => {
        const combined = `${n.title || ''} ${n.message || ''}`;
        if (!STUDENT_CENTER_NOTIF_REGEX.test(combined)) {
          return true; // Personal notifications (Leave, Task, Attendance, Visitor, Room Booking, etc.)
        }
        const msgLower = combined.toLowerCase();
        const matchesStudent = studentNames.some(sName => sName.length >= 2 && msgLower.includes(sName));
        const matchesCenter = centerNames.some(cName => cName.length >= 2 && msgLower.includes(cName));
        return matchesStudent || matchesCenter;
      });
    } else {
      // HR / Front Office / other non-sales, non-ops, non-finance staff: hide student/center notifications
      filtered = notifications.filter(n => {
        const combined = `${n.title || ''} ${n.message || ''}`;
        return !STUDENT_CENTER_NOTIF_REGEX.test(combined);
      });
    }
  }

  const unreadCount = filtered.filter(n => !n.read).length;
  res.json({ success: true, data: filtered, unreadCount });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id }, data: { read: true } });
  res.json({ success: true, message: 'All marked as read' });
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const createNotification = async (organizationId: string, userId: string, type: string, title: string, message: string, data?: any) => {
  return await prisma.notification.create({
    data: { organizationId, userId, type, title, message, data, read: false }
  });
};

export const broadcastNotification = async (organizationId: string, type: string, title: string, message: string, roles?: string[]) => {
  const users = await prisma.user.findMany({
    where: { organizationId, role: roles ? { in: roles } : undefined }
  });
  const notifications = users.map(u => ({ organizationId, userId: u.id, type, title, message, read: false }));
  return await prisma.notification.createMany({ data: notifications });
};

export const sendBroadcastNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { target, targetId, title, message, priority, link } = req.body;
  const organizationId = req.user.organizationId;
  const senderRole = req.user.role;

  if (['finance_admin', 'finance'].includes(senderRole) && !['centers', 'center'].includes(target)) {
    res.status(403).json({ success: false, message: 'Finance users can only send notifications to centers' });
    return;
  }

  let userIds: string[] = [];

  if (target === 'students') {
    const students = await prisma.user.findMany({
      where: { organizationId, role: 'student', status: 'active' },
      select: { id: true }
    });
    userIds = students.map(s => s.id);
  } else if (target === 'student') {
    const studentUser = await prisma.user.findFirst({
      where: { organizationId, role: 'student', id: targetId },
      select: { id: true }
    });
    if (studentUser) userIds = [studentUser.id];
  } else if (target === 'centers') {
    const centers = await prisma.user.findMany({
      where: { organizationId, role: 'center_admin', status: 'active' },
      select: { id: true }
    });
    userIds = centers.map(c => c.id);
  } else if (target === 'center') {
    const centerAdmins = await prisma.user.findMany({
      where: { organizationId, role: 'center_admin', studyCenterId: targetId, status: 'active' },
      select: { id: true }
    });
    userIds = centerAdmins.map(ca => ca.id);
  }

  if (userIds.length === 0) {
    res.status(404).json({ success: false, message: 'No recipient users found for this target' });
    return;
  }

  const notificationType = target === 'students' || target === 'student' ? 'announcement' : 'system';

  const notificationsData = userIds.map(uid => ({
    organizationId,
    userId: uid,
    title,
    message,
    type: notificationType as any,
    priority: (priority || 'medium') as any,
    link: link || null,
    read: false
  }));

  await prisma.notification.createMany({
    data: notificationsData
  });

  res.status(201).json({ success: true, message: `Notification sent to ${userIds.length} users` });
});
