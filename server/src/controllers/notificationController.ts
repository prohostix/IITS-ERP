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
