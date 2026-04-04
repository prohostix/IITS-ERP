import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Notification, { INotification } from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToUser, emitToOrganization } from '../config/socket.js';

// Get notifications for the current user
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { unreadOnly, limit = '20' } = req.query;

  const query: any = { userId: req.user._id };
  if (unreadOnly === 'true') query.read = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit as string));

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });

  res.json({ success: true, data: notifications, unreadCount });
});

// Mark a notification as read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    res.status(404).json({ success: false, message: 'Notification not found' });
    return;
  }

  res.json({ success: true, data: notification });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// Delete a notification
export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ success: true, data: {} });
});

// Helper: broadcast a notification to all users in an org (or specific roles)
export const broadcastNotification = async (
  organizationId: string,
  payload: {
    title: string;
    message: string;
    type?: INotification['type'];
    priority?: INotification['priority'];
    link?: string;
    roles?: string[]; // if empty, send to all users in org
  }
) => {
  const { title, message, type = 'general', priority = 'medium', link, roles } = payload;

  const userQuery: any = { organizationId, status: 'active' };
  if (roles && roles.length > 0) userQuery.role = { $in: roles };

  const users = await User.find(userQuery).select('_id');

  const notifications = users.map((u) => ({
    organizationId,
    userId: u._id,
    title,
    message,
    type,
    priority,
    link,
    read: false,
  }));

  if (notifications.length === 0) return;

  const created = await Notification.insertMany(notifications);

  // Emit real-time to each user's socket room
  for (const notif of created) {
    emitToUser(notif.userId.toString(), 'notification', {
      _id: notif._id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      priority: notif.priority,
      link: notif.link,
      read: false,
      createdAt: notif.createdAt,
    });
  }

  // Also emit unread count update to org room
  emitToOrganization(organizationId, 'notification-count-update', {});
};

// Helper: send a notification to a single specific user
export const notifyUser = async (
  userId: string,
  organizationId: string,
  payload: {
    title: string;
    message: string;
    type?: INotification['type'];
    priority?: INotification['priority'];
    link?: string;
  }
) => {
  const { title, message, type = 'general', priority = 'medium', link } = payload;

  const notif = await Notification.create({
    organizationId,
    userId,
    title,
    message,
    type,
    priority,
    link,
    read: false,
  });

  emitToUser(userId, 'notification', {
    _id: notif._id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    priority: notif.priority,
    link: notif.link,
    read: false,
    createdAt: notif.createdAt,
  });

  emitToOrganization(organizationId, 'notification-count-update', {});
};
