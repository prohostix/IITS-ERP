// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
  res.json({ success: true, data: notifications, unreadCount });
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

  // Security checks:
  // - Operations role can target 'students', 'centers', 'student', 'center'.
  // - Finance role can target 'centers', 'center'.
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
