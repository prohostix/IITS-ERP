import { useState, useEffect, useMemo } from 'react';
import { Target, Plus, RefreshCw, Users, TrendingUp, Edit2, Trash2, Building2, Calendar, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter';
import { usePersistentFilters } from '@/hooks/usePersistentFilters';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SalesUser {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  status: string;
}

interface SalesTarget {
  id: string;
  employeeId: { id: string; name: string; email: string } | null;
  universityId?: string | null;
  university?: { id: string; name: string; code: string } | null;
  sessionId?: string | null;
  session?: { id: string; name: string } | null;
  type: 'revenue' | 'students' | 'centers';
  period: string;
  target: number;
  achieved: number;
  incentive?: number;
  deadline?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  revenue: 'Revenue (₹)',
  students: 'Students / Admissions',
  centers: 'Centers',
};

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

const progressColor = (pct: number, status: string) => {
  if (status === 'completed' || pct >= 100) return 'bg-emerald-500';
  if (status === 'failed') return 'bg-red-500';
  if (pct >= 60) return 'bg-primary';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-blue-500';
};

export function FinanceSalesTargetsPanel() {
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesTarget | null>(null);

  // Persistent Filters
  const [filters, setFilters, clearFilters, isFiltered, setField] = usePersistentFilters('sales_targets_panel', {
    status: 'all' as 'all' | 'active' | 'completed' | 'failed',
    sessions: [] as string[],
    years: [] as string[],
    months: [] as string[],
    users: [] as string[],
    universities: [] as string[],
  });

  const [form, setForm] = useState({
    employeeId: '',
    universityId: 'none',
    sessionId: 'none',
    type: 'revenue' as 'revenue' | 'students' | 'centers',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    target: '',
    achieved: '',
    incentive: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, targetsRes, uniRes, sessRes] = await Promise.allSettled([
        api.get('/finance/sales-users'),
        api.get('/finance/targets'),
        api.get('/operations/universities'),
        api.get('/operations/sessions'),
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data.data || []);
      }
      if (uniRes.status === 'fulfilled') {
        setUniversities(uniRes.value.data.data || []);
      }
      if (sessRes.status === 'fulfilled') {
        setSessions(sessRes.value.data.data || []);
      }

      if (targetsRes.status === 'fulfilled') {
        const salesUserIds = new Set(
          (usersRes.status === 'fulfilled' ? usersRes.value.data.data || [] : []).map((u: SalesUser) => u.id)
        );
        const allTargets: SalesTarget[] = targetsRes.value.data.data || [];
        setTargets(allTargets.filter(t => t.employeeId && (salesUserIds.has(t.employeeId.id) || salesUserIds.size === 0)));
      }
    } catch (e: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const getTargetStatus = (t: SalesTarget): 'active' | 'completed' | 'failed' => {
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

  // Status counts
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

  // Filtered targets
  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      if (!t) return false;

      // Status
      const status = getTargetStatus(t);
      if (filters.status !== 'all' && status !== filters.status) return false;

      // User
      if (filters.users.length > 0) {
        const empId = t.employeeId?.id;
        if (!empId || !filters.users.includes(empId)) return false;
      }

      // University
      if (filters.universities.length > 0) {
        const uId = t.university?.id || t.universityId;
        if (!uId || !filters.universities.includes(uId)) return false;
      }

      // Session
      if (filters.sessions.length > 0) {
        const sId = t.session?.id || t.sessionId;
        if (!sId || !filters.sessions.includes(sId)) return false;
      }

      // Year
      const periodStr = String(t.period || '').trim();
      if (filters.years.length > 0) {
        const targetYear = periodStr.slice(0, 4);
        const createdYear = t.createdAt ? new Date(t.createdAt).getFullYear().toString() : '';
        if (!filters.years.includes(targetYear) && !filters.years.includes(createdYear)) return false;
      }

      // Month
      if (filters.months.length > 0) {
        const paddedMonths = filters.months.map(m => m.padStart(2, '0'));
        let targetMonth = '';
        if (/^\d{4}-\d{2}/.test(periodStr)) {
          targetMonth = periodStr.slice(5, 7);
        } else if (t.createdAt) {
          targetMonth = String(new Date(t.createdAt).getMonth() + 1).padStart(2, '0');
        }
        if (!targetMonth || !paddedMonths.includes(targetMonth)) return false;
      }

      return true;
    });
  }, [targets, filters.status, filters.users, filters.universities, filters.sessions, filters.years, filters.months]);

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

  const openCreate = () => {
    setEditTarget(null);
    setForm({
      employeeId: '',
      universityId: 'none',
      sessionId: 'none',
      type: 'revenue',
      period: new Date().toISOString().slice(0, 7),
      target: '',
      achieved: '',
      incentive: ''
    });
    setShowForm(true);
  };

  const openEdit = (t: SalesTarget) => {
    setEditTarget(t);
    setForm({
      employeeId: t.employeeId?.id || '',
      universityId: t.university?.id || t.universityId || 'none',
      sessionId: t.session?.id || t.sessionId || 'none',
      type: t.type,
      period: t.period,
      target: String(t.target),
      achieved: String(t.achieved),
      incentive: t.incentive != null ? String(t.incentive) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.target || !form.period) {
      toast.error('Employee, period and target value are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        universityId: form.universityId && form.universityId !== 'none' ? form.universityId : null,
        sessionId: form.sessionId && form.sessionId !== 'none' ? form.sessionId : null,
        type: form.type,
        period: form.period,
        target: Number(form.target),
        achieved: Number(form.achieved || 0),
        ...(form.incentive ? { incentive: Number(form.incentive) } : {}),
      };
      if (editTarget) {
        await api.put(`/finance/targets/${editTarget.id}`, payload);
        toast.success('Target updated successfully');
      } else {
        await api.post('/finance/targets', payload);
        toast.success('Target assigned successfully');
      }
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await api.delete(`/finance/targets/${id}`);
      toast.success('Target deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete target');
    }
  };

  const totalTargets = targets.length;
  const achieved100 = statusCounts.completed;
  const avgProgress = targets.length
    ? Math.round(targets.reduce((s, t) => s + (t.target > 0 ? Math.min(100, (t.achieved / t.target) * 100) : 0), 0) / targets.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance Sales Targets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Assign, configure specific university admission targets, and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="shadow-xs">
            <Plus className="w-4 h-4 mr-2" />
            Assign Target
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-2xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Target className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Targets</p>
              <p className="text-2xl font-bold">{totalTargets}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Achieved / Completed</p>
              <p className="text-2xl font-bold">{achieved100}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Avg Progress</p>
              <p className="text-2xl font-bold">{avgProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog/Card */}
      {showForm && (
        <Card className="border-primary/40 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{editTarget ? 'Edit Target' : 'Assign New Target'}</CardTitle>
            <CardDescription>Assign admissions or revenue targets to sales staff with optional university restriction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Sales User *</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Specific University Target */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Specific University (Optional)
                </label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.universityId}
                  onChange={e => setForm(f => ({ ...f, universityId: e.target.value }))}
                >
                  <option value="none">All Universities (General Target)</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </div>

              {/* Admission Session */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Admission Session (Optional)
                </label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.sessionId}
                  onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
                >
                  <option value="none">All Sessions</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Target Type</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                >
                  <option value="revenue">Revenue (₹)</option>
                  <option value="students">Students / Admissions</option>
                  <option value="centers">Study Centers</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Period (YYYY-MM)</label>
                <input
                  type="month"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Target Value *</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="e.g. 10 admissions or ₹100000"
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Achieved (manual override)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="0"
                  value={form.achieved}
                  onChange={e => setForm(f => ({ ...f, achieved: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Incentive (₹ optional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="e.g. 5000"
                  value={form.incentive}
                  onChange={e => setForm(f => ({ ...f, incentive: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editTarget ? 'Update Target' : 'Assign Target'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Tabs & Filters */}
      <div className="flex flex-col gap-4">
        <Tabs value={filters.status} onValueChange={(v: any) => setField('status', v)}>
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

        {/* Filter controls: Session, Year, Month, User, University */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs backdrop-blur-xs flex flex-wrap items-center gap-3">
          <MultiSelectFilter
            title="Sessions"
            selected={filters.sessions}
            onChange={(s) => setField('sessions', s)}
            options={sessions.map(s => ({ label: s.name, value: s.id }))}
            placeholder="All Sessions"
          />

          <MultiSelectFilter
            title="Years"
            selected={filters.years}
            onChange={(y) => setField('years', y)}
            options={availableYears.map(y => ({ label: y, value: y }))}
            placeholder="All Years"
          />

          <MultiSelectFilter
            title="Months"
            selected={filters.months}
            onChange={(m) => setField('months', m)}
            options={MONTHS.map(m => ({ label: m.label, value: m.value }))}
            placeholder="All Months"
          />

          <MultiSelectFilter
            title="Sales Staff"
            selected={filters.users}
            onChange={(u) => setField('users', u)}
            options={users.map(u => ({ label: `${u.name} (${u.role})`, value: u.id }))}
            placeholder="All Sales Staff"
          />

          <MultiSelectFilter
            title="Universities"
            selected={filters.universities}
            onChange={(u) => setField('universities', u)}
            options={universities.map(u => ({ label: u.name, value: u.id }))}
            placeholder="All Universities"
          />

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Targets List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Assigned Targets ({filteredTargets.length})</CardTitle>
            <CardDescription>Filtered by selected session, year, month, staff, and university</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : filteredTargets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No targets match the current filters</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTargets.map(t => {
                const isRevenue = t.type === 'revenue';
                const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                const status = getTargetStatus(t);

                const uniName = t.university?.name || (t.universityId && universities.find(u => u.id === t.universityId)?.name);
                const sessName = t.session?.name || (t.sessionId && sessions.find(s => s.id === t.sessionId)?.name);

                return (
                  <div key={t.id} className="p-4 rounded-xl border border-border/80 hover:border-primary/40 transition-colors bg-card shadow-2xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{t.employeeId?.name || 'Unknown'}</span>
                          
                          {/* Status Badge */}
                          {status === 'completed' && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </Badge>
                          )}
                          {status === 'failed' && (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] flex items-center gap-1 font-semibold">
                              <XCircle className="w-3 h-3" /> Failed
                            </Badge>
                          )}
                          {status === 'active' && (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3" /> Active
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-[10px] uppercase">{TYPE_LABELS[t.type] || t.type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{t.period}</Badge>

                          {/* Specific University badge */}
                          {uniName && (
                            <Badge variant="secondary" className="text-[10px] border border-border flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-primary" />
                              {uniName}
                            </Badge>
                          )}

                          {/* Specific Session badge */}
                          {sessName && (
                            <Badge variant="secondary" className="text-[10px] border border-border flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {sessName}
                            </Badge>
                          )}

                          {t.incentive ? (
                            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                              ₹{t.incentive.toLocaleString('en-IN')} incentive
                            </Badge>
                          ) : null}
                        </div>

                        {/* Progress Bar & Achievement */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', progressColor(pct, status))} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold shrink-0 w-12 text-right', status === 'completed' ? 'text-emerald-600' : status === 'failed' ? 'text-red-500' : 'text-foreground')}>
                            {pct}%
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {isRevenue ? `₹${Number(t.achieved).toLocaleString('en-IN')}` : t.achieved.toLocaleString()} / {isRevenue ? `₹${Number(t.target).toLocaleString('en-IN')}` : `${t.target.toLocaleString()} admissions`}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0 pt-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
