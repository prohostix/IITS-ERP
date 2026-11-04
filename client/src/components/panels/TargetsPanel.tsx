import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, Target, CheckCircle2, XCircle, Clock, Building2, Calendar, User as UserIcon, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TargetsPanelProps {
  endpoint: string; // '/finance/targets' or '/sales/targets'
  title?: string;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function TargetsPanel({ endpoint, title = 'Target Management' }: TargetsPanelProps) {
  const { user } = useAuth();
  const canManage = user?.role === 'sales_admin' || user?.role === 'ceo' || user?.role === 'org_admin' || user?.role === 'superadmin' || user?.role === 'branch_manager' || user?.role === 'finance_admin' || user?.role === 'finance';

  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [universityFilter, setUniversityFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    employeeId: 'none',
    departmentId: 'none',
    universityId: 'none',
    sessionId: 'none',
    target: '',
    achieved: '0',
    incentive: '',
    period: 'monthly',
    type: 'revenue'
  });

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sessionId: sessionFilter !== 'all' ? sessionFilter : undefined,
          year: yearFilter !== 'all' ? yearFilter : undefined,
          month: monthFilter !== 'all' ? monthFilter : undefined,
          userId: userFilter !== 'all' ? userFilter : undefined,
          universityId: universityFilter !== 'all' ? universityFilter : undefined,
        }
      });
      setTargets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load targets', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, statusFilter, sessionFilter, yearFilter, monthFilter, userFilter, universityFilter]);

  const fetchMeta = useCallback(async () => {
    try {
      const [uRes, dRes, uniRes, sessRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/departments'),
        api.get('/operations/universities'),
        api.get('/operations/sessions')
      ]);

      if (uRes.status === 'fulfilled') {
        setEmployees(uRes.value.data.data?.filter((u: any) => !['ceo', 'superadmin', 'org_admin', 'center_admin', 'student'].includes(u.role)) || []);
      }
      if (dRes.status === 'fulfilled') {
        setDepartments(dRes.value.data.data || []);
      }
      if (uniRes.status === 'fulfilled') {
        setUniversities(uniRes.value.data.data || []);
      }
      if (sessRes.status === 'fulfilled') {
        setSessions(sessRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Helper to determine active / completed / failed status
  const getTargetStatus = (t: any): 'active' | 'completed' | 'failed' => {
    const isCompleted = Number(t.achieved) >= Number(t.target) && Number(t.target) > 0;
    if (isCompleted) return 'completed';

    const now = new Date();
    if (t.deadline) {
      return now.getTime() > new Date(t.deadline).getTime() ? 'failed' : 'active';
    }

    const periodStr = String(t.period || '').trim();
    if (/^\d{4}-\d{2}$/.test(periodStr)) {
      const [y, m] = periodStr.split('-').map(Number);
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      return now.getTime() > endOfMonth.getTime() ? 'failed' : 'active';
    } else if (/^\d{4}$/.test(periodStr)) {
      const y = Number(periodStr);
      const endOfYear = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      return now.getTime() > endOfYear.getTime() ? 'failed' : 'active';
    }

    return 'active';
  };

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    const counts = { all: targets.length, active: 0, completed: 0, failed: 0 };
    targets.forEach(t => {
      const s = getTargetStatus(t);
      if (s === 'completed') counts.completed++;
      else if (s === 'failed') counts.failed++;
      else counts.active++;
    });
    return counts;
  }, [targets]);

  // Client-side filtering ensures instant reactivity
  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      if (!t || (!t.id && !t._id)) return false;

      // Status filter
      const status = getTargetStatus(t);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      // User filter
      if (userFilter !== 'all') {
        const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?._id) : (t.employee?.id || t.employeeId);
        if (empId !== userFilter) return false;
      }

      // University filter
      if (universityFilter !== 'all') {
        const uId = typeof t.universityId === 'object' ? (t.universityId?.id || t.universityId?._id) : (t.university?.id || t.universityId);
        if (uId !== universityFilter) return false;
      }

      // Session filter
      if (sessionFilter !== 'all') {
        const sId = typeof t.sessionId === 'object' ? (t.sessionId?.id || t.sessionId?._id) : (t.session?.id || t.sessionId);
        if (sId !== sessionFilter) return false;
      }

      // Period filters
      const periodStr = String(t.period || '').trim();
      if (yearFilter !== 'all') {
        const targetYear = periodStr.slice(0, 4);
        const createdYear = t.createdAt ? new Date(t.createdAt).getFullYear().toString() : '';
        if (targetYear !== yearFilter && createdYear !== yearFilter) return false;
      }

      if (monthFilter !== 'all') {
        const paddedMonth = monthFilter.padStart(2, '0');
        let targetMonth = '';
        if (/^\d{4}-\d{2}/.test(periodStr)) {
          targetMonth = periodStr.slice(5, 7);
        } else if (t.createdAt) {
          targetMonth = String(new Date(t.createdAt).getMonth() + 1).padStart(2, '0');
        }
        if (targetMonth && targetMonth !== paddedMonth) return false;
      }

      return true;
    });
  }, [targets, statusFilter, userFilter, universityFilter, sessionFilter, yearFilter, monthFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<string>([currentYear.toString(), (currentYear - 1).toString()]);
    targets.forEach(t => {
      const p = String(t.period || '');
      if (/^\d{4}/.test(p)) years.add(p.slice(0, 4));
      if (t.createdAt) years.add(new Date(t.createdAt).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [targets]);

  const resetFilters = () => {
    setStatusFilter('all');
    setSessionFilter('all');
    setYearFilter('all');
    setMonthFilter('all');
    setUserFilter('all');
    setUniversityFilter('all');
  };

  const hasActiveFilters = sessionFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all' || userFilter !== 'all' || universityFilter !== 'all';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      target: Number(formData.target),
      achieved: Number(formData.achieved || 0),
      period: formData.period,
      type: formData.type,
      employeeId: formData.employeeId && formData.employeeId !== 'none' ? formData.employeeId : null,
      departmentId: formData.departmentId && formData.departmentId !== 'none' ? formData.departmentId : null,
      universityId: formData.universityId && formData.universityId !== 'none' && formData.universityId !== 'all' ? formData.universityId : null,
      sessionId: formData.sessionId && formData.sessionId !== 'none' && formData.sessionId !== 'all' ? formData.sessionId : null,
      incentive: formData.incentive ? Number(formData.incentive) : null
    };

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
        toast.success('Target updated successfully');
      } else {
        await api.post(endpoint, payload);
        toast.success('Target created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save target');
    }
  };

  const handleEdit = (t: any) => {
    const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?._id) : (t.employee?.id || t.employeeId);
    const deptId = typeof t.departmentId === 'object' ? (t.departmentId?.id || t.departmentId?._id) : (t.department?.id || t.departmentId);
    const uId = typeof t.universityId === 'object' ? (t.universityId?.id || t.universityId?._id) : (t.university?.id || t.universityId);
    const sId = typeof t.sessionId === 'object' ? (t.sessionId?.id || t.sessionId?._id) : (t.session?.id || t.sessionId);

    setEditingId(t.id || t._id);
    setFormData({
      employeeId: empId?.toString() || 'none',
      departmentId: deptId?.toString() || 'none',
      universityId: uId?.toString() || 'none',
      sessionId: sId?.toString() || 'none',
      target: t.target?.toString() || '',
      achieved: t.achieved?.toString() || '0',
      incentive: t.incentive != null ? String(t.incentive) : '',
      period: t.period || 'monthly',
      type: t.type || 'revenue'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('Target deleted');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete target');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employeeId: 'none',
      departmentId: 'none',
      universityId: 'none',
      sessionId: 'none',
      target: '',
      achieved: '0',
      incentive: '',
      period: 'monthly',
      type: 'revenue'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track active, completed, and missed targets across universities & sessions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          {canManage && (
            <DialogTrigger asChild>
              <Button className="shadow-xs"><Plus className="w-4 h-4 mr-2" />Add Target</Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Target' : 'Add New Target'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Employee (Sales User)</Label>
                  <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Organization-wide</SelectItem>
                      {employees.filter(e => e && e.id).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name || e.email} {e.role ? `(${e.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department (optional)</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.filter(d => d && d.id).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target specific university & admission session */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Target University (optional)
                  </Label>
                  <Select value={formData.universityId} onValueChange={(v) => setFormData({ ...formData, universityId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All Universities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Universities (General)</SelectItem>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">If selected, only admissions for this university will count</p>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Admission Session (optional)
                  </Label>
                  <Select value={formData.sessionId} onValueChange={(v) => setFormData({ ...formData, sessionId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All Sessions" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Sessions</SelectItem>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Restrict target to a specific admission session</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Target Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue (₹)</SelectItem>
                      <SelectItem value="students">Students / Admissions</SelectItem>
                      <SelectItem value="centers">Study Centers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. 2026-11, monthly, 2026"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Use 'YYYY-MM' (e.g. 2026-11) or 'monthly' / 'yearly'</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Target Value</Label>
                  <Input type="number" min="0" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} placeholder="e.g. 10" required className="mt-1" />
                </div>
                <div>
                  <Label>Achieved (manual override)</Label>
                  <Input type="number" min="0" value={formData.achieved} onChange={(e) => setFormData({ ...formData, achieved: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Incentive (₹)</Label>
                  <Input type="number" min="0" value={formData.incentive} onChange={(e) => setFormData({ ...formData, incentive: e.target.value })} placeholder="optional" className="mt-1" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Save Target</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-col gap-4">
        <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <TabsList className="grid grid-cols-4 w-full max-w-xl h-11 p-1 bg-muted/60">
            <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs font-medium">
              <span>All Targets</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/80 font-bold">{statusCounts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:text-blue-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 font-bold">{statusCounts.active}</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">{statusCounts.completed}</span>
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-600 font-bold">{statusCounts.failed}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter Toolbar: Session, Year, Month, User, University */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs backdrop-blur-xs flex flex-wrap items-center gap-3">
          {/* Session filter */}
          <div className="w-40 sm:w-44">
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year filter */}
          <div className="w-28">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month filter */}
          <div className="w-32">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User filter */}
          <div className="w-44 sm:w-48">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff / Users</SelectItem>
                {employees.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* University filter */}
          <div className="w-44 sm:w-52">
            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Universities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Targets List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Targets ({filteredTargets.length})
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Showing {statusFilter !== 'all' ? statusFilter : 'all'} targets
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading targets...</div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Target className="w-10 h-10 mx-auto opacity-25" />
              <p className="font-medium">No targets found matching the selected filters</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTargets.map((t) => {
                const tid = t.id || t._id;
                const isRevenue = /revenue|fee|amount|sales/i.test(t.type || '');
                const rawPct = t.target > 0 ? Math.round(((Number(t.achieved) || 0) / Number(t.target)) * 100) : 0;
                const pct = Math.min(100, rawPct);
                const status = getTargetStatus(t);

                const formatVal = (val: number) => {
                  if (isRevenue) {
                    return new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(val || 0);
                  }
                  return val || 0;
                };

                const empName = typeof t.employeeId === 'object' ? t.employeeId?.name : (t.employee?.name || '');
                const deptName = typeof t.departmentId === 'object' ? t.departmentId?.name : (t.department?.name || '');
                const targetTitle = empName || deptName || t.center?.name || 'General Target';

                const uniName = t.university?.name || (t.universityId && universities.find(u => u.id === t.universityId)?.name);
                const sessName = t.session?.name || (t.sessionId && sessions.find(s => s.id === t.sessionId)?.name);

                return (
                  <div key={tid} className="p-4.5 border border-border/80 rounded-xl hover:border-primary/40 transition-all bg-card shadow-2xs">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : status === 'failed'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <Target className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                            <span className="text-base">{targetTitle}</span>

                            {/* Status badge */}
                            {status === 'completed' && (
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Completed
                              </span>
                            )}
                            {status === 'failed' && (
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                            {status === 'active' && (
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Active
                              </span>
                            )}

                            {/* University badge if target is university specific */}
                            {uniName && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-primary" />
                                {uniName}
                              </span>
                            )}

                            {/* Session badge if target is session specific */}
                            {sessName && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {sessName}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span className="capitalize font-medium text-foreground/80">{t.type}</span>
                            <span>•</span>
                            <span className="font-mono">{t.period}</span>
                            {t.incentive ? (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium">Incentive: ₹{Number(t.incentive).toLocaleString('en-IN')}</span>
                              </>
                            ) : null}
                            {t.deadline && (
                              <>
                                <span>•</span>
                                <span className="text-muted-foreground">Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(t)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(tid)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-sm items-baseline">
                        <span className="font-semibold text-foreground">
                          {formatVal(Number(t.achieved) || 0)}{' '}
                          <span className="font-normal text-muted-foreground text-xs">
                            / {formatVal(Number(t.target))} {isRevenue ? '' : 'admissions'}
                          </span>
                        </span>
                        <span className={`font-bold text-sm ${
                          status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : status === 'failed'
                            ? 'text-red-500'
                            : 'text-foreground'
                        }`}>
                          {rawPct}%
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2.5 ${
                          status === 'completed'
                            ? '[&>div]:bg-emerald-500'
                            : status === 'failed'
                            ? '[&>div]:bg-red-500'
                            : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
