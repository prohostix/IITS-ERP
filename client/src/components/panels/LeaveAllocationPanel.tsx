import { useState, useEffect } from 'react';
import { Calendar, Edit, Save, RefreshCw, Plus, Zap, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface LeaveAllocation {
  id?: string;
  userId: any;
  year: number;
  sickLeave: number;
  casualLeave: number;
  earnedLeave: number;
  complementaryLeave: number;
  usedSick: number;
  usedCasual: number;
  usedEarned: number;
  usedComplementary: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  status?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULT_CF_RULES = [
  { leaveType: 'casual', label: 'Casual Leave', enabled: true, maxDays: 6, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'sick', label: 'Sick Leave', enabled: true, maxDays: 6, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'earned', label: 'Earned Leave', enabled: true, maxDays: 15, monthlyCarryForward: true, expiryMonths: 0 },
  { leaveType: 'compensatory', label: 'Compensatory Leave', enabled: true, maxDays: 5, monthlyCarryForward: true, expiryMonths: 0 },
];

export function LeaveAllocationPanel() {
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [carryDialogOpen, setCarryDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    sickLeave: 1, casualLeave: 1, earnedLeave: 1, complementaryLeave: 0,
  });
  const [bulkForm, setBulkForm] = useState({
    sickLeave: 1, casualLeave: 1, earnedLeave: 1, complementaryLeave: 0, overwrite: false,
  });
  const [cfRules, setCfRules] = useState<any[]>(DEFAULT_CF_RULES);
  const [cfBaseForm, setCfBaseForm] = useState({
    fromYear: new Date().getFullYear() - 1,
    toYear: new Date().getFullYear(),
    baseSickLeave: 1,
    baseCasualLeave: 1,
    baseEarnedLeave: 1,
    baseComplementaryLeave: 0,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCfBaseForm(prev => ({ ...prev, fromYear: year - 1, toYear: year }));
    fetchAll();
  }, [year, month]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allocRes, usersRes] = await Promise.all([
        api.get(`/hr/leave-allocations?year=${year}&month=${month}`),
        api.get('/users?status=active'),
      ]);
      setAllocations(allocRes.data?.data || []);
      if (Array.isArray(allocRes.data?.carryForwardRules) && allocRes.data.carryForwardRules.length > 0) {
        const loaded = allocRes.data.carryForwardRules;
        setCfRules(
          DEFAULT_CF_RULES.map(def => {
            const found = loaded.find((r: any) => r.leaveType === def.leaveType);
            return found ? { ...def, ...found } : def;
          })
        );
      }
      const allUsers: User[] = usersRes.data?.data || [];
      setUsers(allUsers.filter(u => !['ceo', 'org_admin', 'superadmin', 'center_admin', 'student'].includes(u.role) && u.status !== 'resigned'));
    } catch {
      toast.error('Failed to load leave allocations');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (alloc?: LeaveAllocation, userId?: string) => {
    if (alloc) {
      const uObj = (alloc as any).user || (typeof alloc.userId === 'object' ? alloc.userId : null);
      setEditingUserId(uObj?.id || alloc.userId);
      setForm({
        sickLeave: alloc.sickLeave,
        casualLeave: alloc.casualLeave,
        earnedLeave: alloc.earnedLeave,
        complementaryLeave: alloc.complementaryLeave,
      });
    } else {
      setEditingUserId(userId || '');
      setForm({ sickLeave: 1, casualLeave: 1, earnedLeave: 1, complementaryLeave: 0 });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUserId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try {
      await api.put(`/hr/leave-allocations/${editingUserId}`, { ...form, year });
      toast.success('Leave allocation saved');
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkInit = async () => {
    setSaving(true);
    try {
      const res = await api.post('/hr/leave-allocations/bulk-init', { ...bulkForm, year });
      toast.success(res.data.message);
      setBulkDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initialize');
    } finally {
      setSaving(false);
    }
  };

  const handleCarryForward = async () => {
    setSaving(true);
    try {
      const res = await api.post('/hr/leave-allocations/carry-forward', {
        ...cfBaseForm,
        rules: cfRules,
      });
      toast.success(res.data?.message || 'Leave carry-forward completed');
      setCarryDialogOpen(false);
      if (cfBaseForm.toYear !== year) {
        setYear(cfBaseForm.toYear);
      } else {
        fetchAll();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to carry forward leaves');
    } finally {
      setSaving(false);
    }
  };

  const allocatedUserIds = new Set(allocations.map(a => {
    const uObj = (a as any).user || (typeof a.userId === 'object' ? a.userId : null);
    return uObj?.id || a.userId;
  }));
  const unallocatedUsers = users.filter(u => !allocatedUserIds.has(u.id));

  const filtered = allocations.filter(a => {
    const uObj = (a as any).user || (typeof a.userId === 'object' ? a.userId : null);
    const name = uObj?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const remaining = (total: number, used: number) => Math.max(0, Number((total - used).toFixed(1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Leave Allocations & Carry-Forward (Monthly Basis)</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage monthly leave quotas (1–4 days/month) with automatic monthly rollover & configurable expiry in HR Settings
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCarryDialogOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Carry Forward ({year - 1} → {year})
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
            <Zap className="w-4 h-4 mr-1" /> Bulk Init
          </Button>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {allocations.some(a => a.sickLeave > 4 || a.casualLeave > 4 || a.earnedLeave > 4) && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
          <span>
            Some employees still have legacy yearly quotas (&gt; 4 days). Click <strong>Bulk Init</strong> with <strong>Overwrite</strong> enabled to switch them to monthly quotas (e.g., 1–2 days/month).
          </span>
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => {
            setBulkForm(f => ({ ...f, overwrite: true }));
            setBulkDialogOpen(true);
          }}>
            Convert to Monthly
          </Button>
        </div>
      )}

      <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No leave allocations for {year}</p>
            <p className="text-xs mt-1">Use "Carry Forward" from {year - 1} or "Bulk Init" to set up all employees</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(alloc => {
            const user = (alloc as any).user || (typeof alloc.userId === 'object' ? alloc.userId : null);
            const uid = user?.id || (typeof alloc.userId === 'string' ? alloc.userId : alloc.id);
            return (
              <Card key={uid} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold">{user?.name || 'Employee'}</span>
                        {user?.role && <Badge variant="outline" className="text-xs capitalize">{user.role.replace(/_/g, ' ')}</Badge>}
                        {user?.designation && <Badge variant="outline" className="text-xs">{user.designation}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {[
                          { label: 'Sick', base: alloc.sickLeave, info: (alloc as any).monthlyBreakdown?.sick, usedFallback: alloc.usedSick || 0, color: 'text-red-500' },
                          { label: 'Casual', base: alloc.casualLeave, info: (alloc as any).monthlyBreakdown?.casual, usedFallback: alloc.usedCasual || 0, color: 'text-blue-500' },
                          { label: 'Earned', base: alloc.earnedLeave, info: (alloc as any).monthlyBreakdown?.earned, usedFallback: alloc.usedEarned || 0, color: 'text-green-500' },
                          { label: 'Comp.', base: alloc.complementaryLeave, info: (alloc as any).monthlyBreakdown?.compensatory, usedFallback: alloc.usedComplementary || 0, color: 'text-purple-500' },
                        ].map(({ label, base, info, usedFallback, color }) => {
                          const total = info ? info.effectiveTotal : base;
                          const used = info ? info.used : usedFallback;
                          const cf = info?.carriedForward || 0;
                          const expired = info?.expired || 0;
                          const isMonthly = info ? info.isMonthly : (base > 0 && base <= 4);
                          return (
                            <div key={label}>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                                <span>{label}</span>
                                <span className="text-[10px] opacity-75">({isMonthly ? `${base}/mo` : 'Yearly'})</span>
                                {cf > 0 && (
                                  <span className="text-[10px] px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
                                    +{cf} CF
                                  </span>
                                )}
                              </p>
                              <p className={`font-semibold ${color}`}>
                                {remaining(total, used)}
                                <span className="text-muted-foreground font-normal text-xs"> / {total} (Used: {used})</span>
                              </p>
                              {expired > 0 && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">Expired: {expired}d</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(alloc)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Monthly Leave Allocation — {year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Enter <strong>monthly</strong> entitlement (1–4 days/month). Unused days automatically roll over month-to-month per HR Settings.
            </p>
            {!allocatedUserIds.has(editingUserId) && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={editingUserId} onValueChange={setEditingUserId}>
                  <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                  <SelectContent>
                    {unallocatedUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.role.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { key: 'sickLeave', label: 'Sick Leave (days / month)' },
                { key: 'casualLeave', label: 'Casual Leave (days / month)' },
                { key: 'earnedLeave', label: 'Earned Leave (days / month)' },
                { key: 'complementaryLeave', label: 'Compensatory (days / month)' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input type="number" min="0" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Init Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Initialize Monthly Leave — {year}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sets default <strong>monthly</strong> leave quotas (days/month) for active employees in {year}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {([
              { key: 'sickLeave', label: 'Sick Leave (days/mo)' },
              { key: 'casualLeave', label: 'Casual Leave (days/mo)' },
              { key: 'earnedLeave', label: 'Earned Leave (days/mo)' },
              { key: 'complementaryLeave', label: 'Compensatory (days/mo)' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input type="number" min="0" value={bulkForm[key]}
                  onChange={e => setBulkForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 mt-2">
            <div>
              <p className="text-xs font-medium">Overwrite existing {year} allocations</p>
              <p className="text-[11px] text-muted-foreground">Keep off to preserve custom / carried-forward balances</p>
            </div>
            <Switch
              checked={bulkForm.overwrite}
              onCheckedChange={v => setBulkForm(f => ({ ...f, overwrite: v }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkInit} disabled={saving}>
              <Zap className="w-4 h-4 mr-1" />{saving ? 'Initializing...' : 'Initialize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry Forward Dialog */}
      <Dialog open={carryDialogOpen} onOpenChange={setCarryDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carry Forward Unused Leaves ({cfBaseForm.fromYear} → {cfBaseForm.toYear})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">
              Calculates unused approved leave balances from <strong>{cfBaseForm.fromYear}</strong> for each active employee, caps them according to the rules below, and adds them to <strong>{cfBaseForm.toYear}</strong>'s base leave allocation. Also saves monthly & yearly rollover policy.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Year</Label>
                <Input
                  type="number"
                  value={cfBaseForm.fromYear}
                  onChange={e => setCfBaseForm(f => ({ ...f, fromYear: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">To Year</Label>
                <Input
                  type="number"
                  value={cfBaseForm.toYear}
                  onChange={e => setCfBaseForm(f => ({ ...f, toYear: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Carry-Forward Rules & Caps</Label>
              {cfRules.map((r, idx) => (
                <div key={r.leaveType} className="grid grid-cols-[1.3fr_1fr_1fr_90px] gap-2 items-center p-2.5 rounded-lg border bg-muted/20 text-xs">
                  <span className="font-semibold capitalize">{r.label || `${r.leaveType} Leave`}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={r.monthlyCarryForward !== false}
                      onCheckedChange={v =>
                        setCfRules(prev => prev.map((item, i) => (i === idx ? { ...item, monthlyCarryForward: v } : item)))
                      }
                    />
                    <span>Monthly</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={r.enabled !== false}
                      onCheckedChange={v =>
                        setCfRules(prev => prev.map((item, i) => (i === idx ? { ...item, enabled: v } : item)))
                      }
                    />
                    <span>Yearly</span>
                  </label>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      disabled={r.enabled === false}
                      value={r.maxDays ?? 0}
                      onChange={e =>
                        setCfRules(prev => prev.map((item, i) => (i === idx ? { ...item, maxDays: Math.max(0, Number(e.target.value)) } : item)))
                      }
                      className="h-8 text-xs"
                      title="Max Carry-Forward Days"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold">Target Year ({cfBaseForm.toYear}) Base Entitlement</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[11px]">Base Sick</Label>
                  <Input type="number" min="0" value={cfBaseForm.baseSickLeave}
                    onChange={e => setCfBaseForm(f => ({ ...f, baseSickLeave: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[11px]">Base Casual</Label>
                  <Input type="number" min="0" value={cfBaseForm.baseCasualLeave}
                    onChange={e => setCfBaseForm(f => ({ ...f, baseCasualLeave: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[11px]">Base Earned</Label>
                  <Input type="number" min="0" value={cfBaseForm.baseEarnedLeave}
                    onChange={e => setCfBaseForm(f => ({ ...f, baseEarnedLeave: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[11px]">Base Comp.</Label>
                  <Input type="number" min="0" value={cfBaseForm.baseComplementaryLeave}
                    onChange={e => setCfBaseForm(f => ({ ...f, baseComplementaryLeave: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCarryForward} disabled={saving}>
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              {saving ? 'Processing...' : `Apply Carry-Forward to ${cfBaseForm.toYear}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
