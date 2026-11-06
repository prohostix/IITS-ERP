import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, UserCircle, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmployeeProfilePanel } from '@/components/panels/EmployeeProfilePanel';
import api from '@/lib/api';

export function EmployeesPanel() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    password?: string;
    departmentId: string;
    role: string;
    designation: string;
    branchId: string;
    status: string;
    permissions: string[];
    canAddPrograms: boolean;
    userId?: string;
  }>({
    userId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    departmentId: '',
    role: 'employee',
    designation: '',
    branchId: '',
    status: 'active',
    permissions: [],
    canAddPrograms: false,
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch { /* non-critical */ }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      // Filter out admin roles - HR should only see regular employees
      const allUsers = response.data.data || [];
      // Only exclude ceo and org_admin — all other roles (including *_admin) are employees
      const employeesOnly = allUsers.filter((user: any) => {
        const role = user.role?.toLowerCase() || '';
        return role !== 'ceo' && role !== 'org_admin' && role !== 'center_admin' && role !== 'student';
      });
      setEmployees(employeesOnly);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        departmentId: formData.departmentId || undefined,
        role: formData.role,
        designation: formData.designation,
        ...(formData.userId ? { userId: formData.userId.trim() } : {}),
        ...(editingId ? {} : { password: formData.password || 'password123' })
      };
      
      let userId = editingId;
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        const res = await api.post('/users', payload);
        userId = res.data.data?.id || res.data.data?.id;
      }

      // If a branch was selected, assign this user as branch manager
      if (formData.branchId && formData.branchId !== 'none' && userId) {
        await api.patch(`/org/branches/${formData.branchId}/manager`, { userId });
      }

      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleEdit = (employee: any) => {
    const empId = employee.id || employee.id;
    const rawDept = employee.departmentId;
    const deptId = typeof rawDept === 'object' && rawDept !== null
      ? (rawDept.id || rawDept.id)
      : (rawDept || employee.department?.id || employee.department?.id);
    setEditingId(empId);
    setFormData({
      userId: employee.userId || employee.employeeCode || '',
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
      departmentId: deptId?.toString() || '',
      role: employee.role || 'employee',
      designation: employee.designation || '',
      branchId: typeof employee.branchId === 'object' ? (employee.branchId?.id || '') : (employee.branchId || ''),
      status: employee.status || 'active',
      permissions: employee.permissions || [],
      canAddPrograms: employee.canAddPrograms || false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchEmployees();
    } catch (error) {
    }
  };

  const openProfile = (id: string) => {
    setProfileUserId(id);
    setProfileOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      userId: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      departmentId: '',
      role: 'employee',
      designation: '',
      branchId: '',
      status: 'active',
      permissions: [],
      canAddPrograms: false,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={variants[status] || ''}>{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <EmployeeProfilePanel
        userId={profileUserId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employee records and information</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Employee ID / Code</Label>
                  <Input
                    value={formData.userId || ''}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    placeholder="e.g. EMP-101 (auto if blank)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              {!editingId && (
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Leave blank to use default (password123)"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <SelectItem value="ops_sub_admin">Operations Sub-Admin</SelectItem>
                      <SelectItem value="sales_admin">Sales Admin</SelectItem>
                      <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                      <SelectItem value="branch_manager">Branch Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    placeholder="e.g. Executive, Team Lead, Manager, HOD"
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
              </div>

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
                          id={`emp-perm-${perm.id}`}
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
                        <label htmlFor={`emp-perm-${perm.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                  id="empCanAddPrograms"
                  checked={formData.canAddPrograms}
                  onChange={(e) =>
                    setFormData({ ...formData, canAddPrograms: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="empCanAddPrograms" className="text-sm font-medium cursor-pointer">
                  Can Add Programs against Universities
                </Label>
              </div>
              {/* Branch assignment — makes this user the branch manager */}
              {branches.length > 0 && (
                <div>
                  <Label>Assign as Branch Manager (optional)</Label>
                  <Select value={formData.branchId} onValueChange={(value) => setFormData({...formData, branchId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch to manage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                          {b.branchManagerId ? ' · has manager' : ' · vacant'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.branchId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This user will be assigned as the branch manager and get access to all branch departments.
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label>Department</Label>
                <Select value={formData.departmentId} onValueChange={(value) => setFormData({...formData, departmentId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter(dept => dept && (dept.id || dept.id)).map((dept) => (
                      <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id).toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-xl border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, role..."
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
                    <SelectItem key={d.id} value={(d.id || '').toString()}>{d.name}</SelectItem>
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
                  <SelectItem value="finance_admin">Finance Admin</SelectItem>
                  <SelectItem value="ops_admin">Ops Admin</SelectItem>
                  <SelectItem value="sales_admin">Sales Admin</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading employee directory...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No employees found</div>
          ) : (() => {
            const filteredEmployees = employees.filter(emp => {
              if (!emp || (!emp.id && !emp._id)) return false;
              if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
              if (deptFilter !== 'all') {
                const empDeptId = typeof emp.departmentId === 'object' ? emp.departmentId?.id : (emp.departmentId || emp.department?.id);
                if (String(empDeptId) !== String(deptFilter)) return false;
              }
              if (statusFilter !== 'all' && (emp.status || 'active') !== statusFilter) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = emp.name?.toLowerCase().includes(q);
                const matchEmail = emp.email?.toLowerCase().includes(q);
                const matchPhone = emp.phone?.toLowerCase().includes(q);
                const matchDesig = emp.designation?.toLowerCase().includes(q);
                const matchRole = emp.role?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchPhone && !matchDesig && !matchRole) return false;
              }
              return true;
            });

            if (filteredEmployees.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No matching employees</p>
                  <p className="text-xs mt-1">Try adjusting your search criteria or clear filters.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees</span>
                  {(searchQuery || deptFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all') && (
                    <button 
                      onClick={() => { setSearchQuery(''); setDeptFilter('all'); setRoleFilter('all'); setStatusFilter('all'); }}
                      className="text-primary hover:underline font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                {filteredEmployees.map((employee) => {
                  const empId = employee.id || employee.id;
                  return (
                  <div key={empId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                        {(employee.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{employee.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.role}{employee.designation ? ` · ${employee.designation}` : ''} • {employee.department?.name || (typeof employee.departmentId === 'object' ? employee.departmentId?.name : '')}
                          {employee.branchId && (
                            <span className="ml-1 text-primary text-xs">
                              · {typeof employee.branchId === 'object' ? employee.branchId?.name : 'Branch Manager'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {employee.email}
                          </span>
                          {employee.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {employee.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(employee.status)}
                      <Button variant="ghost" size="sm" onClick={() => openProfile(empId)} title="View Profile">
                        <UserCircle className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(empId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
