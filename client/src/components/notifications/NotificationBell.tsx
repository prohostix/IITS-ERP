import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Megaphone, ClipboardList, Calendar, AlertCircle, Info } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'task' | 'leave' | 'complaint' | 'system' | 'general';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  link?: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  task: <ClipboardList className="w-4 h-4" />,
  leave: <Calendar className="w-4 h-4" />,
  complaint: <AlertCircle className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-red-500 bg-red-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-blue-500 bg-blue-500/10',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  userId?: string;
  organizationId?: string;
}

export function NotificationBell({ userId, organizationId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=30');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.io real-time
  useEffect(() => {
    if (!userId || !organizationId) return;

    const rawUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '');
    const socket = io(rawUrl && rawUrl !== '' ? rawUrl : window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-user', userId);
      socket.emit('join-org', organizationId);
    });

    socket.on('connect_error', () => {
      // silently ignore — REST polling is the fallback
    });

    socket.on('notification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 30));
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification-count-update', () => {
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, organizationId, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotif = async (id: string, wasUnread: boolean) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-muted transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-rose-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[520px] flex flex-col rounded-xl border border-border bg-background shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors group',
                    !notif.read && 'bg-primary/5'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg h-fit mt-0.5 shrink-0', PRIORITY_COLOR[notif.priority])}>
                    {TYPE_ICON[notif.type] || TYPE_ICON.general}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug', !notif.read && 'font-semibold')}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(notif.id, !notif.read)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-center">
              <button
                onClick={fetchNotifications}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
