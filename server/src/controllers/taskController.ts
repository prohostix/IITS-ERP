// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── HELPER: RESOLVE SUBORDINATES IN ORG HIERARCHY ────────────────────────────
export const getSubordinateUserIds = async (userId: string, organizationId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      designationId: true,
      departmentId: true,
      branchId: true,
      managedDepartments: { select: { id: true } },
      managedBranch: { select: { id: true } },
    }
  });

  if (!user) return [];

  // Superiors at top of the company (Main Office) can assign to anyone
  if (['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(user.role)) {
    const allUsers = await prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true }
    });
    return allUsers.map(u => u.id);
  }

  const subordinateIds = new Set<string>();

  // Load all users and designations for this organization to traverse the hierarchy
  const [allUsers, allDesignations, allDepartments] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, reportingTo: true, designationId: true, departmentId: true, branchId: true, role: true }
    }),
    prisma.designation.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDesignationId: true, branchId: true, departmentId: true }
    }),
    prisma.department.findMany({
      where: { organizationId, status: { not: 'deleted' } },
      select: { id: true, parentDepartmentId: true, managerId: true, type: true, branchId: true }
    })
  ]);

  // 1. Direct & Recursive Reporting Chain (reportingTo)
  const queue = [userId];
  const visitedReporting = new Set<string>([userId]);
  while (queue.length > 0) {
    const currId = queue.shift()!;
    for (const u of allUsers) {
      if (u.reportingTo === currId && !visitedReporting.has(u.id)) {
        visitedReporting.add(u.id);
        subordinateIds.add(u.id);
        queue.push(u.id);
      }
    }
  }

  // 2. Org Chart Designation Tree (Parent -> Child Designations)
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
    if (childDesigIds.size > 0) {
      for (const u of allUsers) {
        if (u.designationId && childDesigIds.has(u.designationId) && u.id !== userId) {
          // If the caller has a branch, restrict to same branch unless either has no branch
          if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
            subordinateIds.add(u.id);
          }
        }
      }
    }
  }

  // 3. Department Management (Manager of department and any sub-departments)
  const managedDeptIds = new Set<string>((user.managedDepartments || []).map(d => d.id));
  if (managedDeptIds.size > 0) {
    const deptQueue = Array.from(managedDeptIds);
    while (deptQueue.length > 0) {
      const currDeptId = deptQueue.shift()!;
      for (const d of allDepartments) {
        if (d.parentDepartmentId === currDeptId && !managedDeptIds.has(d.id)) {
          managedDeptIds.add(d.id);
          deptQueue.push(d.id);
        }
      }
    }
    for (const u of allUsers) {
      if (u.departmentId && managedDeptIds.has(u.departmentId) && u.id !== userId) {
        if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
          subordinateIds.add(u.id);
        }
      }
    }
  }

  // 4. Branch Management (Manager of branch or branch_manager role)
  const branchId = user.managedBranch?.id || (user.role === 'branch_manager' ? user.branchId : null);
  if (branchId) {
    for (const u of allUsers) {
      if (u.branchId === branchId && u.id !== userId) {
        subordinateIds.add(u.id);
      }
    }
  }

  // 5. Central Department Admin Roles: ONLY hr_admin and finance_admin
  // "except hr and finance" -> Central HR and Finance admins can see company-wide department members
  if (['hr_admin', 'finance_admin'].includes(user.role)) {
    const targetType = user.role === 'hr_admin' ? 'hr' : 'finance';
    const matchingDeptIds = new Set(allDepartments.filter(d => d.type === targetType).map(d => d.id));
    for (const u of allUsers) {
      if (u.departmentId && matchingDeptIds.has(u.departmentId) && u.id !== userId) {
        subordinateIds.add(u.id);
      }
    }
  }

  // 6. Fallback for branch department admins (ops_admin, sales_admin) if no designation assigned yet
  // If an ops_admin or sales_admin has no designation or no subordinates resolved yet,
  // limit them ONLY to their own department in their own branch
  if (['ops_admin', 'sales_admin'].includes(user.role) && subordinateIds.size === 0 && user.departmentId) {
    for (const u of allUsers) {
      if (u.departmentId === user.departmentId && u.id !== userId) {
        if (!user.branchId || !u.branchId || u.branchId === user.branchId) {
          subordinateIds.add(u.id);
        }
      }
    }
  }

  return Array.from(subordinateIds);
};

// ─── HELPER: GET NEXT SUPERIOR UP THE ORG HIERARCHY ───────────────────────────
export const getNextSuperior = async (
  userId: string,
  organizationId: string,
  alreadyExplainedUserIds: string[] = []
): Promise<any | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      reportingTo: true,
      designationId: true,
      departmentId: true,
      branchId: true
    }
  });

  if (!user) return null;

  const excluded = new Set([userId, ...alreadyExplainedUserIds]);

  // 1. Check direct reportingTo
  if (user.reportingTo && !excluded.has(user.reportingTo)) {
    const manager = await prisma.user.findFirst({
      where: { id: user.reportingTo, organizationId, status: 'active' },
      select: { id: true, name: true, email: true, designation: true, role: true }
    });
    if (manager) return manager;
  }

  // 2. Check Org Chart parent designation holder
  if (user.designationId) {
    const desig = await prisma.designation.findUnique({
      where: { id: user.designationId },
      select: { parentDesignationId: true }
    });
    if (desig?.parentDesignationId) {
      const superior = await prisma.user.findFirst({
        where: {
          organizationId,
          designationId: desig.parentDesignationId,
          status: 'active',
          id: { notIn: Array.from(excluded) }
        },
        select: { id: true, name: true, email: true, designation: true, role: true }
      });
      if (superior) return superior;
    }
  }

  // 3. Check Department Manager
  if (user.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: user.departmentId },
      select: { managerId: true, parentDepartmentId: true }
    });
    if (dept?.managerId && !excluded.has(dept.managerId)) {
      const deptManager = await prisma.user.findFirst({
        where: { id: dept.managerId, organizationId, status: 'active' },
        select: { id: true, name: true, email: true, designation: true, role: true }
      });
      if (deptManager) return deptManager;
    }
    // If user is already dept manager, check parent department manager
    if (dept?.parentDepartmentId) {
      const parentDept = await prisma.department.findUnique({
        where: { id: dept.parentDepartmentId },
        select: { managerId: true }
      });
      if (parentDept?.managerId && !excluded.has(parentDept.managerId)) {
        const parentDeptManager = await prisma.user.findFirst({
          where: { id: parentDept.managerId, organizationId, status: 'active' },
          select: { id: true, name: true, email: true, designation: true, role: true }
        });
        if (parentDeptManager) return parentDeptManager;
      }
    }
  }

  // 4. Check Branch Manager
  if (user.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
      select: { branchManagerId: true }
    });
    if (branch?.branchManagerId && !excluded.has(branch.branchManagerId)) {
      const branchManager = await prisma.user.findFirst({
        where: { id: branch.branchManagerId, organizationId, status: 'active' },
        select: { id: true, name: true, email: true, designation: true, role: true }
      });
      if (branchManager) return branchManager;
    }
  }

  // 5. Reached Top of Branch/Department -> Escalate to Company CEO
  const ceo = await prisma.user.findFirst({
    where: {
      organizationId,
      role: 'ceo',
      status: 'active',
      id: { notIn: Array.from(excluded) }
    },
    select: { id: true, name: true, email: true, designation: true, role: true }
  });
  if (ceo) return ceo;

  // 6. Fallback to org_admin if no CEO found
  const orgAdmin = await prisma.user.findFirst({
    where: {
      organizationId,
      role: { in: ['org_admin', 'superadmin'] },
      status: 'active',
      id: { notIn: Array.from(excluded) }
    },
    select: { id: true, name: true, email: true, designation: true, role: true }
  });
  return orgAdmin || null;
};

// ─── GET TASKS ────────────────────────────────────────────────────────────────
export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.assignedTo) where.assignedTo = req.query.assignedTo as string;
  if (req.query.status) where.status = req.query.status as string;

  const isAdmin = ['superadmin', 'org_admin', 'ceo', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin'].includes(req.user.role);
  if (!isAdmin) {
    const subordinateIds = await getSubordinateUserIds(req.user.id, req.user.organizationId);
    where.OR = [
      { assignedTo: req.user.id },
      { createdBy: req.user.id },
      { assignedTo: { in: subordinateIds } }
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
      assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

// ─── GET SINGLE TASK ──────────────────────────────────────────────────────────
export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAdmin = ['superadmin', 'org_admin', 'ceo', 'hr_admin', 'hr_sub_admin', 'finance_admin', 'finance_sub_admin', 'ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin'].includes(req.user.role);
  
  const where: any = { id: req.params.id, organizationId: req.user.organizationId };
  if (!isAdmin) {
    const subordinateIds = await getSubordinateUserIds(req.user.id, req.user.organizationId);
    where.OR = [
      { assignedTo: req.user.id },
      { createdBy: req.user.id },
      { assignedTo: { in: subordinateIds } }
    ];
  }

  const task = await prisma.task.findFirst({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
      assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
      department: { select: { id: true, name: true } },
    }
  });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }
  res.status(200).json({ success: true, data: task });
});

// ─── GET ASSIGNABLE USERS (HIERARCHY-BASED) ───────────────────────────────────
export const getAssignableUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const currentUserId = req.user.id;
  const userRole = req.user.role;

  // Top administrators (Main Office) can assign to all active users
  if (['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(userRole)) {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId, status: 'active' as any },
      select: { id: true, name: true, email: true, designation: true, role: true, departmentId: true, branchId: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, count: users.length, data: users });
    return;
  }

  // Resolve all downline subordinates in the org hierarchy
  const subordinateIds = await getSubordinateUserIds(currentUserId, orgId);

  // Allow assigning to subordinates + self (for personal tasks)
  const allowedUserIds = Array.from(new Set([currentUserId, ...subordinateIds]));

  const users = await prisma.user.findMany({
    where: {
      id: { in: allowedUserIds },
      organizationId: orgId,
      status: 'active' as any
    },
    select: { id: true, name: true, email: true, designation: true, role: true, departmentId: true, branchId: true },
    orderBy: { name: 'asc' }
  });

  res.status(200).json({
    success: true,
    count: users.length,
    subordinateCount: subordinateIds.length,
    data: users
  });
});

// ─── CREATE TASK (HIERARCHY VALIDATED) ─────────────────────────────────────────
export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, assignedTo, deadline, priority, departmentId } = req.body;
  const orgId = req.user.organizationId;
  const currentUserId = req.user.id;
  const cleanAssignedTo = assignedTo === 'null' || !assignedTo ? currentUserId : assignedTo;
  const cleanDepartmentId = departmentId === 'null' || !departmentId ? null : departmentId;

  // Validate hierarchy: Only superiors can assign to subordinates (or self-assignment)
  if (cleanAssignedTo !== currentUserId && !['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(req.user.role)) {
    const subordinateIds = await getSubordinateUserIds(currentUserId, orgId);
    if (!subordinateIds.includes(cleanAssignedTo)) {
      res.status(403).json({
        success: false,
        message: 'Cannot assign task: In accordance with the organizational chart hierarchy, superiors can only assign tasks to team members who report below them.'
      });
      return;
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: 'pending' as any,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      organization: { connect: { id: orgId } },
      assignee: { connect: { id: cleanAssignedTo } },
      assigner: { connect: { id: currentUserId } },
      department: cleanDepartmentId ? { connect: { id: cleanDepartmentId } } : undefined
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true } },
      assigner: { select: { id: true, name: true, email: true, designation: true } },
    }
  });

  // Notify assignee
  if (cleanAssignedTo !== currentUserId) {
    await prisma.notification.create({
      data: {
        userId: cleanAssignedTo,
        organizationId: orgId,
        title: 'New Task Assigned',
        message: `${req.user.name} assigned you a new task: "${title}". Due by ${new Date(task.deadline).toLocaleDateString()}`,
        type: 'task',
        link: '/tasks'
      }
    }).catch(() => {});
  }

  res.status(201).json({ success: true, data: { ...task, _id: task.id } });
});

// ─── UPDATE TASK ──────────────────────────────────────────────────────────────
export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, assignedTo, deadline, status, priority, departmentId } = req.body;
  const orgId = req.user.organizationId;
  const currentUserId = req.user.id;

  const existingTask = await prisma.task.findFirst({
    where: { id: req.params.id, organizationId: orgId }
  });
  if (!existingTask) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  // If reassigning, validate hierarchy
  if (assignedTo && assignedTo !== 'null' && assignedTo !== existingTask.assignedTo && assignedTo !== currentUserId) {
    if (!['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(req.user.role)) {
      const subordinateIds = await getSubordinateUserIds(currentUserId, orgId);
      if (!subordinateIds.includes(assignedTo)) {
        res.status(403).json({
          success: false,
          message: 'Cannot reassign task: You can only assign tasks to users below you in the organizational hierarchy.'
        });
        return;
      }
    }
  }

  const updateData: any = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (assignedTo) updateData.assignedTo = assignedTo === 'null' ? null : assignedTo;
  if (deadline) updateData.deadline = new Date(deadline);
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (departmentId) updateData.departmentId = departmentId === 'null' ? null : departmentId;

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: updateData
  });
  res.status(200).json({ success: true, data: { ...task, _id: task.id } });
});

// ─── COMPLETE TASK ────────────────────────────────────────────────────────────
export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const evidenceFiles = (req.files as Express.Multer.File[] || []).map(f => `/uploads/${f.filename}`);

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: 'completed' as any,
      completedAt: new Date(),
      remarks: req.body.remarks,
      evidence: evidenceFiles.length > 0 ? evidenceFiles : undefined,
      explanationPendingFrom: null, // clear pending explanation on completion
    }
  });

  // If there was an active escalation, resolve it
  await prisma.escalation.updateMany({
    where: { taskId: task.id, organizationId: req.user.organizationId },
    data: { status: 'resolved', resolution: 'Task completed by employee', resolvedAt: new Date(), resolvedBy: req.user.id }
  }).catch(() => {});

  res.status(200).json({ success: true, data: { ...task, _id: task.id } });
});

// ─── DELETE TASK ──────────────────────────────────────────────────────────────
export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

// ─── GET PENDING EXPLANATION TASK FOR CURRENT USER ─────────────────────────────
// Returns the overdue/failed task requiring an explanation from this user.
// The frontend uses this to trigger a persistent, blocking popup until answered!
export const getPendingExplanationTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const orgId = req.user.organizationId;
  const now = new Date();

  // 1. Check if there is an explicit task waiting for this user's explanation
  let task = await prisma.task.findFirst({
    where: {
      organizationId: orgId,
      explanationPendingFrom: userId,
      status: { not: 'completed' as any }
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
      assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { deadline: 'asc' }
  });

  // 2. If no explicit task, check if the current user has any overdue task they haven't explained yet
  if (!task) {
    const overdueTask = await prisma.task.findFirst({
      where: {
        organizationId: orgId,
        assignedTo: userId,
        deadline: { lt: now },
        status: { in: ['pending', 'in_progress', 'overdue'] as any },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
        assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { deadline: 'asc' }
    });

    if (overdueTask) {
      const explanations = Array.isArray(overdueTask.explanations) ? overdueTask.explanations : [];
      const hasEmployeeExplained = explanations.some((e: any) => e.userId === userId);

      if (!hasEmployeeExplained) {
        task = await prisma.task.update({
          where: { id: overdueTask.id },
          data: {
            status: 'overdue' as any,
            escalationStatus: 'overdue_employee',
            explanationPendingFrom: userId
          },
          include: {
            assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
            assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
            department: { select: { id: true, name: true } },
          }
        });
      }
    }
  }

  if (!task) {
    res.json({ success: true, hasPendingExplanation: false, data: null });
    return;
  }

  const isAssignee = task.assignedTo === userId;
  const isCEO = ['ceo', 'org_admin', 'superadmin'].includes(req.user.role);
  const explanations = Array.isArray(task.explanations) ? task.explanations : [];

  res.json({
    success: true,
    hasPendingExplanation: true,
    data: {
      task,
      role: isAssignee ? 'assignee' : (isCEO ? 'ceo' : 'superior'),
      explanations,
      previousExplanationCount: explanations.length,
      isDirectFailure: isAssignee,
      subordinateName: task.assignee?.name
    }
  });
});

// ─── SUBMIT TASK EXPLANATION & ESCALATE UP TO CEO ─────────────────────────────
export const submitTaskExplanation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { explanation } = req.body;
  const userId = req.user.id;
  const orgId = req.user.organizationId;

  if (!explanation || !explanation.trim()) {
    res.status(400).json({ success: false, message: 'Please provide a clear and detailed explanation.' });
    return;
  }

  const task = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true, role: true } },
      assigner: { select: { id: true, name: true, email: true, designation: true, role: true } },
      department: { select: { id: true, name: true } },
    }
  });

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  // Uploaded files if any
  const evidenceFiles = (req.files as Express.Multer.File[] || []).map(f => `/uploads/${f.filename}`);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, designation: true, role: true }
  });

  const existingExplanations = Array.isArray(task.explanations) ? task.explanations : [];
  const isAssignee = task.assignedTo === userId;
  const nextLevel = existingExplanations.length + 1;

  const newEntry = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName: currentUser?.name || 'Staff',
    userEmail: currentUser?.email || '',
    designation: currentUser?.designation || currentUser?.role || 'Team Member',
    role: currentUser?.role || 'employee',
    level: nextLevel,
    type: isAssignee ? 'employee_failure_explanation' : 'superior_managerial_explanation',
    explanation: explanation.trim(),
    evidence: evidenceFiles,
    submittedAt: new Date().toISOString()
  };

  const updatedExplanations = [...existingExplanations, newEntry];
  const allExplainedIds = updatedExplanations.map(e => e.userId);

  // Find the next superior up the hierarchy!
  const nextSuperior = await getNextSuperior(userId, orgId, allExplainedIds);

  let nextPendingUserId: string | null = null;
  let nextEscalationStatus: EscalationStatus = 'overdue_employee';

  if (nextSuperior) {
    nextPendingUserId = nextSuperior.id;
    nextEscalationStatus = nextSuperior.role === 'ceo' ? 'escalated_ceo' : 'escalated_dept';

    // Notify next superior
    await prisma.notification.create({
      data: {
        userId: nextSuperior.id,
        organizationId: orgId,
        title: '⚠️ Task Escalation: Managerial Explanation Required',
        message: `${currentUser?.name} submitted an explanation for failed task "${task.title}" (assigned to ${task.assignee?.name}). As superior, your explanation is now required.`,
        type: 'escalation',
        link: '/tasks'
      }
    }).catch(() => {});
  } else {
    // If no direct superior, check if current user is already CEO
    const isAlreadyCEO = ['ceo', 'org_admin'].includes(currentUser?.role || '');
    if (!isAlreadyCEO) {
      // Escalate directly to CEO
      const ceo = await prisma.user.findFirst({
        where: { organizationId: orgId, role: { in: ['ceo', 'org_admin'] }, status: 'active' }
      });
      if (ceo && !allExplainedIds.includes(ceo.id)) {
        nextPendingUserId = ceo.id;
        nextEscalationStatus = 'escalated_ceo';

        await prisma.notification.create({
          data: {
            userId: ceo.id,
            organizationId: orgId,
            title: '🚨 Final Escalation Reached: Task Failure',
            message: `Task "${task.title}" failed by ${task.assignee?.name} has escalated through management and now awaits executive review.`,
            type: 'escalation',
            link: '/tasks'
          }
        }).catch(() => {});
      }
    }
  }

  // Update or create Escalation entity
  let escalation = await prisma.escalation.findFirst({
    where: { taskId: task.id, organizationId: orgId }
  });

  if (escalation) {
    await prisma.escalation.update({
      where: { id: escalation.id },
      data: {
        chain: updatedExplanations,
        handledBy: nextPendingUserId || userId,
        status: nextPendingUserId ? 'pending' : 'resolved',
        currentLevel: nextLevel
      }
    });
    await prisma.escalationLog.create({
      data: {
        organizationId: orgId,
        escalationId: escalation.id,
        action: isAssignee ? 'employee_explanation_submitted' : 'superior_explanation_submitted',
        remarks: `Explanation submitted by ${currentUser?.name} (${currentUser?.designation || currentUser?.role})`
      }
    }).catch(() => {});
  } else {
    escalation = await prisma.escalation.create({
      data: {
        organizationId: orgId,
        taskId: task.id,
        employeeId: task.assignedTo,
        handledBy: nextPendingUserId || userId,
        status: 'pending',
        type: 'task_deadline_failure',
        description: `Task "${task.title}" was not completed by deadline ${new Date(task.deadline).toLocaleDateString()}`,
        chain: updatedExplanations,
        currentLevel: nextLevel,
        raisedById: task.createdBy
      }
    });
    await prisma.escalationLog.create({
      data: {
        organizationId: orgId,
        escalationId: escalation.id,
        action: 'task_escalation_created',
        remarks: `Task failed by deadline. Explanation submitted by ${currentUser?.name}`
      }
    }).catch(() => {});
  }

  // Update Task record
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'overdue' as any,
      explanations: updatedExplanations,
      explanationPendingFrom: nextPendingUserId,
      escalationStatus: nextEscalationStatus,
      escalatedTo: nextPendingUserId,
      escalatedAt: new Date()
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, designation: true } }
    }
  });

  res.json({
    success: true,
    message: nextSuperior
      ? `Explanation recorded. Escalated to superior ${nextSuperior.name} (${nextSuperior.designation || nextSuperior.role}) for managerial explanation.`
      : 'Explanation recorded. Escalation has reached the company CEO for review.',
    data: updatedTask
  });
});

// ─── CEO RESOLVE ESCALATION ───────────────────────────────────────────────────
export const resolveTaskEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { resolution, action } = req.body;
  const userId = req.user.id;
  const orgId = req.user.organizationId;

  if (!['ceo', 'org_admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Only the Company CEO or Organization Admin can resolve escalations' });
    return;
  }

  const task = await prisma.task.findFirst({
    where: { id, organizationId: orgId }
  });

  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  const existingExplanations = Array.isArray(task.explanations) ? task.explanations : [];
  const ceoUser = await prisma.user.findUnique({ where: { id: userId } });

  const finalEntry = {
    id: `ceo-resolution-${Date.now()}`,
    userId,
    userName: ceoUser?.name || 'Company CEO',
    userEmail: ceoUser?.email || '',
    designation: 'Chief Executive Officer',
    role: req.user.role,
    level: existingExplanations.length + 1,
    type: 'ceo_executive_resolution',
    explanation: resolution || 'Reviewed and acknowledged by CEO',
    action: action || 'resolved',
    submittedAt: new Date().toISOString()
  };

  const updatedExplanations = [...existingExplanations, finalEntry];

  await prisma.task.update({
    where: { id: task.id },
    data: {
      explanations: updatedExplanations,
      explanationPendingFrom: null,
      remarks: resolution ? `CEO Resolution: ${resolution}` : task.remarks
    }
  });

  await prisma.escalation.updateMany({
    where: { taskId: task.id, organizationId: orgId },
    data: {
      status: 'resolved',
      resolution: resolution || 'Resolved by CEO',
      resolvedAt: new Date(),
      resolvedBy: userId,
      chain: updatedExplanations
    }
  });

  res.json({ success: true, message: 'Task escalation reviewed and resolved by CEO successfully.' });
});
