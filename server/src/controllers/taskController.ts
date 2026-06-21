// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.assignedTo) where.assignedTo = req.query.assignedTo as string;
  if (req.query.status) where.status = req.query.status as string;
  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { name: true, email: true } },
      assigner: { select: { name: true, email: true } },
      department: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignee: { select: { name: true, email: true } },
      assigner: { select: { name: true, email: true } },
      department: { select: { name: true } },
    }
  });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }
  res.status(200).json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, assignedTo, deadline, priority, departmentId } = req.body;

  const cleanAssignedTo = assignedTo === 'null' || !assignedTo ? req.user.id : assignedTo;
  const cleanDepartmentId = departmentId === 'null' || !departmentId ? null : departmentId;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: 'pending' as any,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // default 7 days deadline
      organization: { connect: { id: req.user.organizationId } },
      assignee: { connect: { id: cleanAssignedTo } },
      assigner: { connect: { id: req.user.id } },
      department: cleanDepartmentId ? { connect: { id: cleanDepartmentId } } : undefined
    }
  });
  res.status(201).json({ success: true, data: { ...task, _id: task.id } });
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, assignedTo, deadline, status, priority, departmentId } = req.body;
  
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

export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: 'completed' as any,
      completedAt: new Date(),
      remarks: req.body.remarks,
    }
  });
  res.status(200).json({ success: true, data: { ...task, _id: task.id } });
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const getAssignableUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { organizationId: req.user.organizationId, status: 'active' as any },
    select: { id: true, name: true, email: true, designation: true }
  });
  res.status(200).json({ success: true, count: users.length, data: users });
});
