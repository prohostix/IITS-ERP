import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Building2,
  Shield,
  UserCog,
  GraduationCap,
  DollarSign,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle?: () => void;
  title?: string;
}

const roleIcons: Record<string, React.ElementType> = {
  superadmin: Shield,
  org_admin: Building2,
  ceo: UserCog,
  ops_admin: GraduationCap,
  finance_admin: DollarSign,
  hr_admin: Briefcase,
  sales_admin: TrendingUp,
  employee: User,
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  org_admin: 'Organization Admin',
  ceo: 'CEO',
  ops_admin: 'Operations Admin',
  finance_admin: 'Finance Admin',
  hr_admin: 'HR Admin',
  sales_admin: 'Sales Admin',
  employee: 'Employee',
};

export function Header({ onMenuToggle, title }: HeaderProps) {
  const { user, logout, switchRole } = useAuth();
  const [notifications, setNotifications] = React.useState([
    { id: 1, title: 'Task Overdue', message: 'Follow up with Hyderabad lead is overdue', time: '2 hours ago', read: false },
    { id: 2, title: 'New Leave Request', message: 'Priya Patel requested leave', time: '4 hours ago', read: false },
    { id: 3, title: 'Payment Received', message: 'Invoice #INV-2024-003 payment received', time: '1 day ago', read: true },
  ]);

  if (!user) return null;

  const RoleIcon = roleIcons[user.role] || User;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRoleSwitch = (role: string) => {
    switchRole(role as any);
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title || 'Dashboard'}</h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 w-64 bg-slate-50 border-slate-200"
          />
        </div>

        {/* Role Switcher (Demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <RoleIcon className="w-4 h-4" />
              <span className="capitalize">{roleLabels[user.role]}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(roleLabels).map(([role, label]) => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={cn(user.role === role && 'bg-slate-100')}
              >
                {React.createElement(roleIcons[role] || User, { className: 'w-4 h-4 mr-2' })}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex flex-col items-start py-3 px-4 cursor-pointer',
                    !notification.read && 'bg-blue-50'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm">{notification.title}</span>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                  <span className="text-xs text-slate-400 mt-1">{notification.time}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
