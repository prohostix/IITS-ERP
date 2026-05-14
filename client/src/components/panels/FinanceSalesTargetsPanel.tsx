import { useState, useEffect } from 'react';
import { Target, Plus, RefreshCw, Users, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  type: 'revenue' | 'students' | 'centers';
  period: string;
  target: number;
  achieved: number;
  incentive?: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  students: 'Students',
  centers: 'Centers',
};

const progressColor = (pct: number) => {
  if (pct >= 100) return 'bg-success';
  if (pct >= 60) return 'bg-primary';
  if (pct >= 30) return 'bg-warning';
  return 'bg-error';
};

export function FinanceSalesTargetsPanel() {
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesTarget | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
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
      const [usersRes, targetsRes] = await Promise.all([
        api.get('/finance/sales-users'),
        api.get('/finance/targets'),
      ]);
      setUsers(usersRes.data.data || []);
      // Filter targets that belong to sales users
      const salesUserIds = new Set((usersRes.data.data || []).map((u: SalesUser) => u.id));
      const allTargets: SalesTarget[] = targetsRes.data.data || [];
      setTargets(allTargets.filter(t => t.employeeId && salesUserIds.has(t.employeeId.id)));
    } catch (e: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ employeeId: '', type: 'revenue', period: new Date().toISOString().slice(0, 7), target: '', achieved: '', incentive: '' });
    setShowForm(true);
  };

  const openEdit = (t: SalesTarget) => {
    setEditTarget(t);
    setForm({
      employeeId: t.employeeId?.id || '',
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
        type: form.type,
        period: form.period,
        target: Number(form.target),
        achieved: Number(form.achieved || 0),
        ...(form.incentive ? { incentive: Number(form.incentive) } : {}),
      };
      if (editTarget) {
        await api.put(`/finance/targets/${editTarget.id}`, payload);
        toast.success('Target updated');
      } else {
        await api.post('/finance/targets', payload);
        toast.success('Target assigned');
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
    if (!confirm('Delete this target?')) return;
    try {
      await api.delete(`/finance/targets/${id}`);
      toast.success('Target deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalTargets = targets.length;
  const achieved100 = targets.filter(t => t.target > 0 && t.achieved >= t.target).length;
  const avgProgress = targets.length
    ? Math.round(targets.reduce((s, t) => s + (t.target > 0 ? Math.min(100, (t.achieved / t.target) * 100) : 0), 0) / targets.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Targets</h2>
          <p className="text-sm text-muted-foreground mt-1">Assign and track targets for the sales team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Target
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Target className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Targets</p>
              <p className="text-2xl font-bold">{totalTargets}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Achieved 100%</p>
              <p className="text-2xl font-bold">{achieved100}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Avg Progress</p>
              <p className="text-2xl font-bold">{avgProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">{editTarget ? 'Edit Target' : 'Assign New Target'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Sales User</label>
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Type</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                >
                  <option value="revenue">Revenue</option>
                  <option value="students">Students</option>
                  <option value="centers">Centers</option>
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
                <label className="text-xs font-medium text-muted-foreground uppercase">Target Value</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="e.g. 100000"
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Achieved (optional)</label>
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
                <label className="text-xs font-medium text-muted-foreground uppercase">Incentive (optional)</label>
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
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Assign'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Targets list */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Targets</CardTitle>
          <CardDescription>All targets assigned to sales team members</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : targets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No targets assigned yet</p>
              <p className="text-sm mt-1">Click "Assign Target" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {targets.map(t => {
                const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                return (
                  <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{t.employeeId?.name || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{TYPE_LABELS[t.type]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{t.period}</Badge>
                        {t.incentive ? <Badge variant="outline" className="text-[10px] text-success border-success/30">₹{t.incentive.toLocaleString()} incentive</Badge> : null}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', progressColor(pct))} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold shrink-0 w-10 text-right">{pct}%</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {t.achieved.toLocaleString()} / {t.target.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
