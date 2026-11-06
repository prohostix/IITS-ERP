import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Key, Users, ArrowRightLeft, TrendingUp, TrendingDown, 
  Upload, Loader2, Image as ImageIcon, Search, Filter, Ban, UserX, UserMinus, RotateCcw, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface User {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  departmentId?: string;
  additionalDepartmentIds?: string[];
  subDepartmentId?: string;
  reportingTo?: string;
  department?: { name: string; id?: string };
  additionalDepartments?: { id: string; name: string }[];
  subDepartment?: { name: string };
  reportingToUser?: { name: string };
  status?: string;
  remarks?: string;
}

interface Department {
  id?: string;
  name: string;
  type: string;
  managerId?: string;
  parentDepartmentId?: string;
}

interface SubDepartment {
  id?: string;
  name: string;
  parentDeptId: string;
}

interface DesignationOption {
  id: string;
  title: string;
  departmentId?: { id: string; name: string };
  maxHeadcount: number;
  filledBy: any[];
}

export function HRUsersPanel({ defaultStatus = 'all' }: { defaultStatus?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'suspended' | 'resigned'>(
    defaultStatus === 'resigned' ? 'resigned' : defaultStatus === 'suspended' ? 'suspended' : 'all'
  );

  // Suspend & Resign Dialog States
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [userToResign, setUserToResign] = useState<User | null>(null);
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignationReason, setResignationReason] = useState('');
  const [resigning, setResigning] = useState(false);

  const [formData, setFormData] = useState<{
    userId?: string;
    name: string;
    email: string;
    password?: string;
    role: string;
    designation: string;
    departmentId: string;
    additionalDepartmentIds: string[];
    subDepartmentId: string;
    reportingTo: string;
    permissions: string[];
    canAddPrograms: boolean;
    avatar?: string;
  }>({
    userId: '',
    name: '',
    email: '',
    password: '',
    role: 'employee',
    designation: '',
    departmentId: '',
    additionalDepartmentIds: [],
    subDepartmentId: '',
    reportingTo: '',
    permissions: [],
    canAddPrograms: false,
    avatar: '',
  });

  const [transferData, setTransferData] = useState({
    departmentId: '',
    subDepartmentId: '',
    reason: '',
  });

  const [promotionData, setPromotionData] = useState({
    newDesignation: '',
    newRole: 'employee',
    reportingTo: '',
    type: 'promotion' as 'promotion' | 'demotion',
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchSubDepartments();
    fetchDesignations();
  }, []);

  useEffect(() => {
    // Fetch sub-departments when department changes
    if (formData.departmentId) {
      fetchSubDepartmentsByParent(formData.departmentId);
    }
  }, [formData.departmentId]);

  useEffect(() => {
    // Fetch sub-departments when transfer department changes
    if (transferData.departmentId) {
      fetchSubDepartmentsByParent(transferData.departmentId);
    }
  }, [transferData.departmentId]);

  useEffect(() => {
    if (defaultStatus === 'resigned') {
      setActiveTab('resigned');
      setStatusFilter('resigned');
    } else if (defaultStatus === 'suspended') {
      setActiveTab('suspended');
      setStatusFilter('suspended');
    }
  }, [defaultStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      const allUsers = response.data.data || response.data || [];
      // Exclude top-level admin roles, centers and students — everyone else is headcount
      const staffUsers = allUsers.filter((user: User) =>
        !['ceo', 'general_manager', 'org_admin', 'superadmin', 'center_admin', 'student'].includes(user.role)
      );
      setUsers(staffUsers);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || response.data || []);
    } catch (_error) {
    }
  };

  const fetchSubDepartments = async () => {
    try {
      const response = await api.get('/sub-departments');
      setSubDepartments(response.data.data || response.data || []);
    } catch (_error) {
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await api.get('/org/designations');
      setDesignations(response.data.data || []);
    } catch (_error) {
      // Designations may not exist yet — that's fine
    }
  };

  const fetchSubDepartmentsByParent = async (parentId: string) => {
    try {
      const response = await api.get(`/sub-departments?parentDeptId=${parentId}`);
      setSubDepartments(response.data.data || response.data || []);
    } catch (_error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const additionalDepts = formData.additionalDepartmentIds.filter(id => id && id !== formData.departmentId);
      const customUserId = formData.userId?.trim() || undefined;
      if (editingUser) {
        const userId = editingUser.id || editingUser.id;
        await api.put(`/users/${userId}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          designation: formData.designation || undefined,
          departmentId: (formData.departmentId && formData.departmentId !== 'none') ? formData.departmentId : undefined,
          additionalDepartmentIds: additionalDepts,
          subDepartmentId: (formData.subDepartmentId && formData.subDepartmentId !== 'none') ? formData.subDepartmentId : undefined,
          reportingTo: (formData.reportingTo && formData.reportingTo !== 'none') ? formData.reportingTo : undefined,
          avatar: formData.avatar || undefined,
          userId: customUserId,
        });
      } else {
        await api.post('/users', {
          ...formData,
          userId: customUserId,
          additionalDepartmentIds: additionalDepts,
          departmentId: (formData.departmentId && formData.departmentId !== 'none') ? formData.departmentId : undefined,
          subDepartmentId: (formData.subDepartmentId && formData.subDepartmentId !== 'none') ? formData.subDepartmentId : undefined,
          reportingTo: (formData.reportingTo && formData.reportingTo !== 'none') ? formData.reportingTo : undefined,
          avatar: formData.avatar || undefined,
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (_error) {
      alert('Failed to save user. Please try again.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      const userId = selectedUser.id || selectedUser.id;
      await api.put(`/users/${userId}`, {
        departmentId: (transferData.departmentId && transferData.departmentId !== 'none') ? transferData.departmentId : undefined,
        subDepartmentId: (transferData.subDepartmentId && transferData.subDepartmentId !== 'none') ? transferData.subDepartmentId : undefined,
      });
      
      setTransferDialogOpen(false);
      setTransferData({ departmentId: '', subDepartmentId: '', reason: '' });
      setSelectedUser(null);
      fetchUsers();
      alert('Employee transferred successfully!');
    } catch (_error) {
      alert('Failed to transfer employee. Please try again.');
    }
  };

  const handlePromotionDemotion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      const userId = selectedUser.id || selectedUser.id;
      await api.put(`/users/${userId}`, {
        designation: promotionData.newDesignation,
        role: promotionData.newRole,
        reportingTo: (promotionData.reportingTo && promotionData.reportingTo !== 'none') ? promotionData.reportingTo : undefined,
      });
      
      setPromotionDialogOpen(false);
      setPromotionData({ newDesignation: '', newRole: 'employee', reportingTo: '', type: 'promotion' });
      setSelectedUser(null);
      fetchUsers();
      alert(`Employee ${promotionData.type === 'promotion' ? 'promoted' : 'demoted'} successfully!`);
    } catch (_error) {
      alert(`Failed to ${promotionData.type} employee. Please try again.`);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      await api.put(`/users/${selectedUserId}`, {
        password: passwordData.newPassword,
      });
      setPasswordDialogOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setSelectedUserId(null);
      alert('Password updated successfully!');
    } catch (_error) {
      alert('Failed to update password. Please try again.');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (_error) {
      alert('Failed to delete user. Please try again.');
    }
  };

  const openSuspendDialog = (user: User) => {
    setUserToSuspend(user);
    setSuspendReason('');
    setSuspendDialogOpen(true);
  };

  const handleSuspendConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToSuspend?.id) return;
    setSuspending(true);
    try {
      await api.put(`/users/${userToSuspend.id}`, {
        status: 'suspended',
        remarks: suspendReason || 'Suspended by HR'
      });
      toast.success(`${userToSuspend.name} has been suspended. Login access is now blocked.`);
      setSuspendDialogOpen(false);
      setUserToSuspend(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  const openResignDialog = (user: User) => {
    setUserToResign(user);
    setResignationDate(new Date().toISOString().split('T')[0]);
    setResignationReason('');
    setResignDialogOpen(true);
  };

  const handleResignConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResign?.id) return;
    setResigning(true);
    try {
      await api.put(`/users/${userToResign.id}`, {
        status: 'resigned',
        remarks: resignationReason ? `Resigned on ${resignationDate}: ${resignationReason}` : `Resigned on ${resignationDate}`
      });
      toast.success(`${userToResign.name} has been marked as resigned and moved to Resigned Staff.`);
      setResignDialogOpen(false);
      setUserToResign(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark user as resigned');
    } finally {
      setResigning(false);
    }
  };

  const handleReactivate = async (user: User) => {
    if (!user.id) return;
    const isResigned = user.status === 'resigned';
    const actionLabel = isResigned ? 'Re-instate / Re-hire' : 'Reactivate (Unsuspend)';
    if (!confirm(`Are you sure you want to ${actionLabel} ${user.name}? They will be able to log into the ERP again.`)) {
      return;
    }
    try {
      await api.put(`/users/${user.id}`, {
        status: 'active',
        remarks: isResigned ? 'Re-instated by HR' : 'Unsuspended by HR'
      });
      toast.success(`${user.name} has been reactivated. Login access has been restored.`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reactivate user');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    const deptId = typeof user.departmentId === 'object' && user.departmentId !== null
      ? ((user.departmentId).id || (user.departmentId).id)
      : user.departmentId;
    const subDeptId = typeof user.subDepartmentId === 'object' && user.subDepartmentId !== null
      ? ((user.subDepartmentId).id || (user.subDepartmentId).id)
      : user.subDepartmentId;
    const reportingToId = typeof user.reportingTo === 'object' && user.reportingTo !== null
      ? ((user.reportingTo).id || (user.reportingTo).id)
      : user.reportingTo;
    const additionalIds = (user.additionalDepartments || []).map((d: any) =>
      typeof d === 'object' ? (d.id || d.id) : d
    ).filter(Boolean);
    setFormData({
      userId: user.userId || (user as any).employeeId || '',
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      designation: user.designation || '',
      departmentId: deptId?.toString() || '',
      additionalDepartmentIds: additionalIds,
      subDepartmentId: subDeptId?.toString() || '',
      reportingTo: reportingToId?.toString() || '',
      permissions: user.permissions || [],
      canAddPrograms: (user as any).canAddPrograms || false,
      avatar: user.avatar || '',
    });
    setDialogOpen(true);
  };

  const openTransferDialog = (user: User) => {
    setSelectedUser(user);
    setTransferData({
      departmentId: user.departmentId || '',
      subDepartmentId: user.subDepartmentId || '',
      reason: '',
    });
    setTransferDialogOpen(true);
  };

  const openPromotionDialog = (user: User, type: 'promotion' | 'demotion') => {
    setSelectedUser(user);
    setPromotionData({
      newDesignation: user.designation || '',
      newRole: user.role,
      reportingTo: user.reportingTo || '',
      type,
    });
    setPromotionDialogOpen(true);
  };

  const openPasswordDialog = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setPasswordDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      name: '',
      email: '',
      password: '',
      role: 'employee',
      designation: '',
      departmentId: '',
      additionalDepartmentIds: [],
      subDepartmentId: '',
      reportingTo: '',
      permissions: [],
      canAddPrograms: false,
      avatar: '',
    });
    setEditingUser(null);
  };

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      employee: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      hr_admin: 'bg-orange-100 text-orange-800',
      finance_admin: 'bg-emerald-100 text-emerald-800',
      ops_admin: 'bg-indigo-100 text-indigo-800',
      ops_sub_admin: 'bg-violet-100 text-violet-800',
      sales_admin: 'bg-pink-100 text-pink-800',
      center_admin: 'bg-cyan-100 text-cyan-800',
      bde: 'bg-yellow-100 text-yellow-800',
    };
    return map[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CardTitle>
              {activeTab === 'resigned' 
                ? 'Resigned Staff Directory' 
                : activeTab === 'suspended' 
                  ? 'Suspended Users' 
                  : 'User Management'}
            </CardTitle>
            {activeTab === 'resigned' && (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-semibold gap-1">
                <UserX className="w-3 h-3" /> Resigned Staff
              </Badge>
            )}
            {activeTab === 'suspended' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold gap-1">
                <Ban className="w-3 h-3" /> Suspended
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'resigned'
              ? 'Former staff accounts that have resigned. Deactivated from system login.'
              : activeTab === 'suspended'
                ? 'Accounts currently suspended. Blocked from logging into ERP.'
                : 'Manage all staff accounts — HR, Finance, Ops, Sales, and Employees'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit Employee User' : 'Create Employee User'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-6 pb-2">
                <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0 group">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                  )}
                  
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setUploadingAvatar(true);
                        const formDataPayload = new FormData();
                        formDataPayload.append('file', file);
                        
                        try {
                          const res = await api.post('/enrollment/upload', formDataPayload, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          setFormData(prev => ({ ...prev, avatar: res.data.url }));
                        } catch (err) {
                          alert('Failed to upload image. Please try again.');
                        } finally {
                          setUploadingAvatar(false);
                        }
                      }}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="userId">Employee ID / Code</Label>
                    <Input
                      id="userId"
                      placeholder="e.g. EMP-101 (auto if blank)"
                      value={formData.userId || ''}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="designation">Designation</Label>
                {designations.length > 0 ? (
                  <Select
                    value={formData.designation}
                    onValueChange={(value) => {
                      // Auto-fill department if designation has one
                      const desig = designations.find(d => d.title === value);
                      setFormData({
                        ...formData,
                        designation: value,
                        departmentId: desig?.departmentId?.id || formData.departmentId,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select from org chart..." />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map(d => {
                        const filled = d.filledBy?.length || 0;
                        const vacant = d.maxHeadcount - filled;
                        return (
                          <SelectItem key={d.id} value={d.title} disabled={vacant <= 0}>
                            {d.title}
                            {d.departmentId ? ` — ${d.departmentId.name}` : ''}
                            {vacant <= 0 ? ' (Full)' : ` (${vacant} open)`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g., Executive, Team Lead, Manager, HOD"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Executive', 'Team Lead', 'Manager', 'HOD'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          className="text-[10px] px-2 py-0.5 rounded border bg-muted/50 hover:bg-primary hover:text-primary-foreground font-medium transition-colors"
                          onClick={() => setFormData({ ...formData, designation: tag })}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {designations.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Org Admin can define positions in the Hierarchy chart for structured assignment.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hod">HOD (Head of Department)</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="general_manager">General Manager</SelectItem>
                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                    <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                    <SelectItem value="finance_admin">Finance Admin</SelectItem>
                    <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                    <SelectItem value="ops_admin">Operations Admin</SelectItem>
                    <SelectItem value="ops_sub_admin">Ops Sub Admin</SelectItem>
                    <SelectItem value="sales_admin">Sales Admin</SelectItem>
                    <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                    <SelectItem value="bde">BDE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Primary Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, departmentId: value, subDepartmentId: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id)!}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Additional departments — for branch managers etc. */}
              <div>
                <Label>Additional Departments <span className="text-xs text-muted-foreground font-normal">(for branch managers with multi-dept access)</span></Label>
                <div className="mt-2 border rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto bg-muted/30">
                  {departments
                    .filter(d => (d.id || d.id) !== formData.departmentId && (d.id || d.id) !== 'none')
                    .map(dept => {
                      const deptId = (dept.id || dept.id)!;
                      const checked = formData.additionalDepartmentIds.includes(deptId);
                      return (
                        <label key={deptId} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? formData.additionalDepartmentIds.filter(id => id !== deptId)
                                : [...formData.additionalDepartmentIds, deptId];
                              setFormData({ ...formData, additionalDepartmentIds: next });
                            }}
                            className="rounded"
                          />
                          {dept.name}
                          <span className="text-xs text-muted-foreground">({dept.type})</span>
                        </label>
                      );
                    })}
                  {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments available</p>}
                </div>
              </div>
              {formData.departmentId && subDepartments.length > 0 && (
                <div>
                  <Label htmlFor="subDepartment">Sub-Department</Label>
                  <Select
                    value={formData.subDepartmentId}
                    onValueChange={(value) => setFormData({ ...formData, subDepartmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-department (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sub-Department</SelectItem>
                      {subDepartments.map((subDept) => (
                        <SelectItem key={subDept.id || subDept.id} value={(subDept.id || subDept.id)!}>
                          {subDept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.role.endsWith('_sub_admin') && (
                <div className="space-y-3 pt-2">
                  <Label>Module Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border">
                    {[
                      { id: 'attendance', label: 'Attendance' },
                      { id: 'leaves', label: 'Leaves' },
                      { id: 'payroll', label: 'Payroll' },
                      { id: 'invoices', label: 'Invoices' },
                      { id: 'users', label: 'Users' },
                      { id: 'employees', label: 'Employees' },
                      { id: 'vacancies', label: 'Vacancies' },
                      { id: 'complaints', label: 'Complaints' },
                      { id: 'leads', label: 'Leads' },
                      { id: 'deals', label: 'Deals' },
                      { id: 'referrals', label: 'Referrals' },
                      { id: 'centers', label: 'Study Centers' },
                      { id: 'programs', label: 'Programs' },
                      { id: 'payments', label: 'Payments' },
                      { id: 'fees', label: 'Fee Structures' },
                      { id: 'center_admissions', label: 'Center Admissions' },
                      { id: 'sales_admission_report', label: 'Sales Admissions Report' },
                      { id: 'sales_users_report', label: 'Sales Users Report' },
                    ].map(perm => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`hr-perm-${perm.id}`}
                          checked={formData.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, permissions: [...formData.permissions, perm.id] });
                            } else {
                              setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm.id) });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={`hr-perm-${perm.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hrCanAddPrograms"
                  checked={formData.canAddPrograms}
                  onChange={(e) =>
                    setFormData({ ...formData, canAddPrograms: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="hrCanAddPrograms" className="text-sm font-medium cursor-pointer">
                  Can Add Programs against Universities
                </Label>
              </div>

              <div>
                <Label htmlFor="reportingTo">Reports To</Label>
                <Select
                  value={formData.reportingTo}
                  onValueChange={(value) => setFormData({ ...formData, reportingTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {users.filter(u => (u.id || u.id) !== (editingUser?.id || editingUser?.id)).map((user) => (
                      <SelectItem key={user.id || user.id} value={(user.id || user.id)!}>
                        {user.name} {user.designation ? `(${user.designation})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update' : 'Create'} User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Tab Bar */}
        {(() => {
          const totalCount = users.length;
          const activeCount = users.filter((u) => !u.status || u.status === 'active').length;
          const suspendedCount = users.filter((u) => u.status === 'suspended').length;
          const resignedCount = users.filter((u) => u.status === 'resigned').length;

          return (
            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setStatusFilter('all');
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border',
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted border-transparent hover:text-foreground'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Staff</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('active');
                  setStatusFilter('active');
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border',
                  activeTab === 'active'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300')}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('suspended');
                  setStatusFilter('suspended');
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border',
                  activeTab === 'suspended'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
                )}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Suspended</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'suspended' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300')}>
                  {suspendedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('resigned');
                  setStatusFilter('resigned');
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border',
                  activeTab === 'resigned'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20'
                )}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Resigned Staff</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'resigned' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300')}>
                  {resignedCount}
                </span>
              </button>
            </div>
          );
        })()}

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-xl border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user by name, email, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id || ''}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="hr_admin">HR Admin</SelectItem>
                <SelectItem value="hr_sub_admin">HR Sub-Admin</SelectItem>
                <SelectItem value="finance_admin">Finance Admin</SelectItem>
                <SelectItem value="finance_sub_admin">Finance Sub-Admin</SelectItem>
                <SelectItem value="ops_admin">Ops Admin</SelectItem>
                <SelectItem value="ops_sub_admin">Ops Sub-Admin</SelectItem>
                <SelectItem value="sales_admin">Sales Admin</SelectItem>
                <SelectItem value="sales_sub_admin">Sales Sub-Admin</SelectItem>
                <SelectItem value="branch_manager">Branch Manager</SelectItem>
                <SelectItem value="general_manager">General Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                if (val === 'active' || val === 'suspended' || val === 'resigned' || val === 'all') {
                  setActiveTab(val as any);
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="suspended">Suspended Only</SelectItem>
                <SelectItem value="resigned">Resigned Staff Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(() => {
          const filteredUsers = users.filter((u) => {
            if (roleFilter !== 'all' && u.role !== roleFilter) return false;
            if (deptFilter !== 'all') {
              const uDeptId = u.departmentId || u.department?.id;
              if (uDeptId !== deptFilter) return false;
            }
            const uStatus = u.status || 'active';
            if (activeTab !== 'all') {
              if (activeTab === 'active' && uStatus !== 'active') return false;
              if (activeTab === 'suspended' && uStatus !== 'suspended') return false;
              if (activeTab === 'resigned' && uStatus !== 'resigned') return false;
            } else if (statusFilter !== 'all') {
              if (uStatus !== statusFilter) return false;
            }
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const matchName = u.name?.toLowerCase().includes(q);
              const matchEmail = u.email?.toLowerCase().includes(q);
              const matchDesig = u.designation?.toLowerCase().includes(q);
              if (!matchName && !matchEmail && !matchDesig) return false;
            }
            return true;
          });

          if (users.length === 0) {
            return (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                <p className="text-sm">Create your first user to get started</p>
              </div>
            );
          }

          if (filteredUsers.length === 0) {
            return (
              <div className="text-center py-12 text-muted-foreground">
                {activeTab === 'resigned' ? (
                  <>
                    <UserX className="w-12 h-12 mx-auto mb-3 opacity-40 text-rose-500" />
                    <p className="font-semibold text-foreground">No Resigned Staff</p>
                    <p className="text-xs mt-1">There are currently no staff members marked as resigned.</p>
                  </>
                ) : activeTab === 'suspended' ? (
                  <>
                    <Ban className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-500" />
                    <p className="font-semibold text-foreground">No Suspended Users</p>
                    <p className="text-xs mt-1">There are currently no users with suspended login access.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No matching users</p>
                    <p className="text-xs mt-1">Try adjusting your search terms or filters</p>
                  </>
                )}
                {(searchQuery || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all' || activeTab !== 'all') && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => { 
                      setSearchQuery(''); 
                      setRoleFilter('all'); 
                      setDeptFilter('all'); 
                      setStatusFilter('all'); 
                      setActiveTab('all');
                    }}
                    className="mt-2 text-xs"
                  >
                    Reset all filters
                  </Button>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing <strong>{filteredUsers.length}</strong> of {users.length} users
                  {activeTab !== 'all' && <span className="ml-1 font-medium capitalize">({activeTab})</span>}
                </span>
                {(searchQuery || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all' || activeTab !== 'all') && (
                  <button 
                    onClick={() => { 
                      setSearchQuery(''); 
                      setRoleFilter('all'); 
                      setDeptFilter('all'); 
                      setStatusFilter('all'); 
                      setActiveTab('all');
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {filteredUsers.map((user) => {
              const userId = user.id || user.id || '';
              const isSuspended = user.status === 'suspended';
              const isResigned = user.status === 'resigned';
              return (
                <div
                  key={userId}
                  className={cn(
                    "flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors",
                    isSuspended && "border-amber-300/60 bg-amber-500/[0.02]",
                    isResigned && "border-rose-300/60 bg-rose-500/[0.02] opacity-90"
                  )}
                >
                  <div className="flex-1 flex gap-4 items-start">
                    {user.avatar ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0 mt-1">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-1",
                        isResigned ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600" :
                        isSuspended ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {isResigned ? (
                          <UserX className="w-6 h-6" />
                        ) : isSuspended ? (
                          <Ban className="w-6 h-6" />
                        ) : (
                          <Users className="w-6 h-6 opacity-50" />
                        )}
                      </div>
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{user.name}</h3>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                        {isSuspended && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Suspended
                          </Badge>
                        )}
                        {isResigned && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold flex items-center gap-1">
                            <UserX className="w-3 h-3" /> Resigned Staff
                          </Badge>
                        )}
                        {user.status === 'inactive' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Inactive
                          </Badge>
                        )}
                        {(!user.status || user.status === 'active') && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                        {user.designation && (
                          <span><strong>Designation:</strong> {user.designation}</span>
                        )}
                        {user.department && (
                          <span>
                            <strong>Department:</strong> {user.department.name}
                            {user.subDepartment && ` → ${user.subDepartment.name}`}
                          </span>
                        )}
                        {user.additionalDepartments && user.additionalDepartments.length > 0 && (
                          <span>
                            <strong>Also:</strong> {user.additionalDepartments.map((d: any) => d.name || d).join(', ')}
                          </span>
                        )}
                        {user.reportingToUser && (
                          <span><strong>Reports to:</strong> {user.reportingToUser.name}</span>
                        )}
                      </div>
                      {user.remarks && (isSuspended || isResigned) && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/60 px-2 py-1 rounded border border-dashed inline-block">
                          Status note: {user.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center">
                    {/* Suspend / Resign / Reactivate Actions */}
                    {isSuspended ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(user)}
                          title="Reactivate / Unsuspend User (Restore Login Access)"
                          className="h-8 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-medium text-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Unsuspend</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResignDialog(user)}
                          title="Mark as Resigned Staff"
                          className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : isResigned ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(user)}
                        title="Re-instate / Re-hire Staff (Restore Active Status & Login Access)"
                        className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 font-medium text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-instate</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSuspendDialog(user)}
                          title="Suspend User (Block Login Access)"
                          className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResignDialog(user)}
                          title="Mark as Resigned Staff (Block Login & Move to Resigned Staff)"
                          className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransferDialog(user)}
                      title="Transfer Employee"
                      className="h-8 w-8 p-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPromotionDialog(user, 'promotion')}
                      title="Promote Employee"
                      className="h-8 w-8 p-0"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPromotionDialog(user, 'demotion')}
                      title="Demote Employee"
                      className="h-8 w-8 p-0"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordDialog(userId)}
                      title="Change Password"
                      className="h-8 w-8 p-0"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      title="Edit User"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(userId)}
                      title="Delete User"
                      className="h-8 w-8 p-0 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                );
              })}
          </div>
          );
        })()}
      </CardContent>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Re-enter password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Password</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Employee Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Employee</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-semibold">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">
                Current: {selectedUser.department?.name || 'No Department'}
              </p>
            </div>
          )}
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label htmlFor="transferDepartment">New Department</Label>
              <Select
                value={transferData.departmentId}
                onValueChange={(value) => {
                  setTransferData({ ...transferData, departmentId: value, subDepartmentId: '' });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id)!}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transferData.departmentId && subDepartments.length > 0 && (
              <div>
                <Label htmlFor="transferSubDepartment">Sub-Department</Label>
                <Select
                  value={transferData.subDepartmentId}
                  onValueChange={(value) => setTransferData({ ...transferData, subDepartmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Sub-Department</SelectItem>
                    {subDepartments.map((subDept) => (
                      <SelectItem key={subDept.id || subDept.id} value={(subDept.id || subDept.id)!}>
                        {subDept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="transferReason">Reason for Transfer</Label>
              <Input
                id="transferReason"
                value={transferData.reason}
                onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferData({ departmentId: '', subDepartmentId: '', reason: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Transfer Employee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Promotion/Demotion Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {promotionData.type === 'promotion' ? 'Promote' : 'Demote'} Employee
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-semibold">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">
                Current: {selectedUser.designation || 'No Designation'} ({selectedUser.role})
              </p>
            </div>
          )}
          <form onSubmit={handlePromotionDemotion} className="space-y-4">
            <div>
              <Label htmlFor="newDesignation">New Designation</Label>
              {designations.length > 0 ? (
                <Select
                  value={promotionData.newDesignation}
                  onValueChange={(value) => setPromotionData({ ...promotionData, newDesignation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from org chart..." />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(d => {
                      const filled = d.filledBy?.length || 0;
                      const vacant = d.maxHeadcount - filled;
                      return (
                        <SelectItem key={d.id} value={d.title}>
                          {d.title}
                          {d.departmentId ? ` — ${d.departmentId.name}` : ''}
                          {vacant <= 0 ? ' (Full)' : ` (${vacant} open)`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="newDesignation"
                  value={promotionData.newDesignation}
                  onChange={(e) => setPromotionData({ ...promotionData, newDesignation: e.target.value })}
                  required
                  placeholder="e.g., Senior Manager, Team Lead"
                />
              )}
            </div>
            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select
                value={promotionData.newRole}
                onValueChange={(value) => setPromotionData({ ...promotionData, newRole: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newReportingTo">Reports To</Label>
              <Select
                value={promotionData.reportingTo}
                onValueChange={(value) => setPromotionData({ ...promotionData, reportingTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reporting manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users.filter(u => (u.id || u.id) !== (selectedUser?.id || selectedUser?.id)).map((user) => (
                    <SelectItem key={user.id || user.id} value={(user.id || user.id)!}>
                      {user.name} {user.designation ? `(${user.designation})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPromotionDialogOpen(false);
                  setPromotionData({ newDesignation: '', newRole: 'employee', reportingTo: '', type: 'promotion' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {promotionData.type === 'promotion' ? 'Promote' : 'Demote'} Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suspend User Confirmation Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <DialogTitle>Suspend User Account</DialogTitle>
            </div>
          </DialogHeader>
          {userToSuspend && (
            <form onSubmit={handleSuspendConfirm} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm space-y-1">
                <p className="font-semibold text-foreground">{userToSuspend.name}</p>
                <p className="text-xs text-muted-foreground">{userToSuspend.email} &bull; {userToSuspend.designation || userToSuspend.role}</p>
                <div className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> Suspending this user will immediately terminate active sessions and block them from logging in to the ERP. Their records and history will be preserved.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspendReason">Reason / Remarks (Optional)</Label>
                <Textarea
                  id="suspendReason"
                  placeholder="e.g., Pending disciplinary review, temporary leave, or security precaution..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSuspendDialogOpen(false);
                    setUserToSuspend(null);
                  }}
                  disabled={suspending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={suspending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {suspending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend User
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Resign Employee Dialog */}
      <Dialog open={resignDialogOpen} onOpenChange={setResignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <UserX className="w-5 h-5" />
              <DialogTitle>Mark Employee as Resigned</DialogTitle>
            </div>
          </DialogHeader>
          {userToResign && (
            <form onSubmit={handleResignConfirm} className="space-y-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm space-y-1">
                <p className="font-semibold text-foreground">{userToResign.name}</p>
                <p className="text-xs text-muted-foreground">{userToResign.email} &bull; {userToResign.designation || userToResign.role}</p>
                <div className="mt-2 text-xs text-rose-800 dark:text-rose-300">
                  <strong>Notice:</strong> Marking this employee as resigned will block their login access immediately, move them into the <strong>Resigned Staff Directory</strong>, and automatically exclude them from regular monthly payroll processing.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resignationDate">Effective Resignation Date</Label>
                <Input
                  id="resignationDate"
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resignationReason">Exit Reason / Notes (Optional)</Label>
                <Textarea
                  id="resignationReason"
                  placeholder="e.g., Higher studies, relocation, career opportunity, personal reasons..."
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResignDialogOpen(false);
                    setUserToResign(null);
                  }}
                  disabled={resigning}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={resigning}
                  variant="destructive"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {resigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Marking Resigned...
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Confirm Resignation
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
