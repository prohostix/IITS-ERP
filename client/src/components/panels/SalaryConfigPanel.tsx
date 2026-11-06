import { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, RefreshCw, Plus, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SalaryConfig {
  id?: string;
  userId: any;
  basicSalary: number;
  allowances: { hra: number; transport: number; medical: number; other: number };
  deductions: { pf: number; tax: number; insurance: number; other: number };
  lateDeductionPerMinute: number;
  effectiveFrom?: string;
  professionalTax: number;
  labourWelfareFund: number;
  tds: number;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected';
  rejectedRemarks?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
  departmentId?: any;
}

const EMPTY_CONFIG = {
  basicSalary: 0,
  allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
  deductions: { pf: 0, tax: 0, insurance: 0, other: 0 },
  lateDeductionPerMinute: 0,
  professionalTax: 0,
  labourWelfareFund: 0,
  tds: 0,
  effectiveFrom: new Date().toISOString().split('T')[0],
};

export function SalaryConfigPanel() {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [form, setForm] = useState<any>(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, usersRes] = await Promise.all([
        api.get('/hr/salary-configs'),
        api.get('/users'),
      ]);
      setConfigs(cfgRes.data.data || []);
      const allUsers: User[] = usersRes.data.data || [];
      setUsers(allUsers.filter(u => !['ceo', 'general_manager', 'org_admin', 'superadmin', 'center_admin', 'student'].includes(u.role)));
    } catch {
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (config?: SalaryConfig, userId?: string) => {
    if (config) {
      setEditingUserId(typeof config.userId === 'object' ? config.userId.id : config.userId);
      setForm({
        basicSalary: config.basicSalary,
        allowances: { ...config.allowances },
        deductions: { ...config.deductions },
        lateDeductionPerMinute: config.lateDeductionPerMinute || 0,
        professionalTax: config.professionalTax || 0,
        labourWelfareFund: config.labourWelfareFund || 0,
        tds: config.tds || 0,
        effectiveFrom: config.effectiveFrom ? config.effectiveFrom.split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingUserId(userId || '');
      setForm({ ...EMPTY_CONFIG });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUserId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try {
      await api.put(`/hr/salary-configs/${editingUserId}`, form);
      toast.success('Salary config saved');
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Remove salary config for this employee?')) return;
    try {
      await api.delete(`/hr/salary-configs/${userId}`);
      toast.success('Salary config removed');
      fetchAll();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const configuredUserIds = new Set(configs.map(c =>
    typeof c.userId === 'object' ? c.userId.id : c.userId
  ));
  const unconfiguredUsers = users.filter(u => !configuredUserIds.has(u.id));

  const filtered = configs.filter(c => {
    const name = (typeof c.userId === 'object' ? c.userId.name : '') || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const gross = (f: any) =>
    (f.basicSalary || 0) + Object.values(f.allowances as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
  const net = (f: any) => {
    const defaultDeductions = Object.values(f.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
    const statutoryDeductions = (f.professionalTax || 0) + (f.labourWelfareFund || 0) + (f.tds || 0);
    let pf = 0;
    if (f.basicSalary <= 15000) pf = f.basicSalary * 0.12;
    return gross(f) - defaultDeductions - statutoryDeductions - pf;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salary Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1">Set base salary, allowances, deductions and late deduction rate per employee</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="w-4 h-4 mr-1" /> Add Config
          </Button>
        </div>
      </div>

      <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No salary configs yet</p>
            <p className="text-xs mt-1">Click "Add Config" to set up an employee's salary</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(config => {
            const user = (config as any).user || (typeof config.userId === 'object' ? config.userId : null);
            const uid = user?.id || (typeof config.userId === 'string' ? config.userId : config.id);
            const grossAmt = gross(config);
            const statutoryAmt = (config.professionalTax || 0) + (config.labourWelfareFund || 0) + (config.tds || 0);
            const netAmt = grossAmt - Object.values(config.deductions).reduce((s, v) => s + (v || 0), 0) - statutoryAmt;
            return (
              <Card key={uid} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{user?.name || 'Employee'}</span>
                        <Badge variant="outline" className="text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</Badge>
                        {user?.designation && <Badge variant="outline" className="text-xs">{user.designation}</Badge>}
                        {config.approvalStatus === 'pending_approval' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Clock className="w-3 h-3" />Pending Finance Approval
                          </span>
                        )}
                        {config.approvalStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />Approved
                          </span>
                        )}
                        {config.approvalStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{user?.email}</p>
                      {config.approvalStatus === 'rejected' && config.rejectedRemarks && (
                        <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{config.rejectedRemarks}
                        </p>
                      )}                      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Basic</p>
                          <p className="font-semibold">₹{config.basicSalary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gross</p>
                          <p className="font-semibold text-blue-600">₹{grossAmt.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold text-green-600">₹{netAmt.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Late/min</p>
                          <p className="font-semibold text-orange-600">₹{config.lateDeductionPerMinute || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(config)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(uid)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Employee selector (only when creating new) */}
            {!configs.find(c => (typeof c.userId === 'object' ? c.userId.id : c.userId) === editingUserId) && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Input
                  placeholder="Search employee by name or role..."
                  value={employeeSearchQuery}
                  onChange={e => setEmployeeSearchQuery(e.target.value)}
                  className="mb-1.5"
                />
                <Select value={editingUserId} onValueChange={setEditingUserId}>
                  <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {unconfiguredUsers
                      .filter(u => {
                        if (!employeeSearchQuery.trim()) return true;
                        const q = employeeSearchQuery.toLowerCase();
                        return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
                      })
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {u.role.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tabs for Earnings, Statutory, and Deductions/Policies */}
            <Tabs defaultValue="earnings" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="statutory">Statutory</TabsTrigger>
                <TabsTrigger value="policies">Policies & Other</TabsTrigger>
              </TabsList>

              {/* Earnings Tab */}
              <TabsContent value="earnings" className="space-y-4 pt-3">
                <div className="space-y-1">
                  <Label className="font-semibold">Basic Salary (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.basicSalary}
                    onChange={e => setForm((f: any) => ({ ...f, basicSalary: Number(e.target.value) }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Must be at least 50% of total Gross Salary under statutory rules</p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Allowances</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['hra', 'transport', 'medical', 'other'] as const).map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="capitalize text-xs">{key === 'hra' ? 'HRA' : key} (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.allowances[key]}
                          onChange={e => setForm((f: any) => ({
                            ...f,
                            allowances: { ...f.allowances, [key]: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Statutory Tab (Req 8, 9) */}
              <TabsContent value="statutory" className="space-y-4 pt-3">
                <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1 mb-2">
                  <p className="font-semibold text-foreground">Statutory Deductions & Contributions</p>
                  <p className="text-muted-foreground">All mandatory state & central compliance deductions (ESI, PF, TDS, PT, LWF) are configured here.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ESI (Formerly Insurance) */}
                  <div className="space-y-1 border p-2.5 rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-xs">ESI Deduction (₹)</Label>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline font-semibold"
                        onClick={() => {
                          const grossVal = gross(form);
                          // Standard employee contribution is 0.75% of gross if gross <= 21000
                          const calculated = grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0;
                          setForm((f: any) => ({ ...f, deductions: { ...f.deductions, insurance: calculated } }));
                          toast.info(`ESI set to ₹${calculated} (0.75% of gross)`);
                        }}
                      >
                        Auto (0.75%)
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={form.deductions.insurance}
                      onChange={e => setForm((f: any) => ({
                        ...f,
                        deductions: { ...f.deductions, insurance: Number(e.target.value) }
                      }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Employee State Insurance (0.75% of monthly earned gross)</p>
                  </div>

                  {/* PF */}
                  <div className="space-y-1 border p-2.5 rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-xs">PF Deduction (₹)</Label>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline font-semibold"
                        onClick={() => {
                          const calculated = Math.round(form.basicSalary * 0.12);
                          setForm((f: any) => ({ ...f, deductions: { ...f.deductions, pf: calculated } }));
                          toast.info(`PF set to ₹${calculated} (12% of basic)`);
                        }}
                      >
                        Auto (12%)
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={form.deductions.pf}
                      onChange={e => setForm((f: any) => ({
                        ...f,
                        deductions: { ...f.deductions, pf: Number(e.target.value) }
                      }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Provident Fund (Standard 12% of monthly basic)</p>
                  </div>

                  {/* TDS / Income Tax */}
                  <div className="space-y-1 border p-2.5 rounded-lg bg-card">
                    <Label className="font-semibold text-xs">TDS / Income Tax (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.tds || form.deductions.tax || 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setForm((f: any) => ({
                          ...f,
                          tds: val,
                          deductions: { ...f.deductions, tax: val }
                        }));
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground">Monthly Tax Deducted at Source</p>
                  </div>

                  {/* Professional Tax (PT) */}
                  <div className="space-y-1 border p-2.5 rounded-lg bg-card">
                    <Label className="font-semibold text-xs">Professional Tax (PT) (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.professionalTax}
                      onChange={e => setForm((f: any) => ({ ...f, professionalTax: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-muted-foreground">State Professional Tax slab</p>
                  </div>

                  {/* Labour Welfare Fund (LWF) */}
                  <div className="space-y-1 border p-2.5 rounded-lg bg-card col-span-1 sm:col-span-2">
                    <Label className="font-semibold text-xs">Labour Welfare Fund (LWF) (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.labourWelfareFund}
                      onChange={e => setForm((f: any) => ({ ...f, labourWelfareFund: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Statutory State Labour Welfare Fund contribution</p>
                  </div>
                </div>
              </TabsContent>

              {/* Policies & Other Tab */}
              <TabsContent value="policies" className="space-y-4 pt-3">
                <div className="space-y-1">
                  <Label className="font-semibold text-xs">Other Non-Statutory Deductions (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.deductions.other}
                    onChange={e => setForm((f: any) => ({
                      ...f,
                      deductions: { ...f.deductions, other: Number(e.target.value) }
                    }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Any company-specific advances, loans, or equipment deductions</p>
                </div>

                <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-xs">Late Deduction per Minute (₹)</Label>
                    <span className="text-[10px] text-muted-foreground">Auto-calc based on month days:</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.lateDeductionPerMinute}
                    onChange={e => setForm((f: any) => ({ ...f, lateDeductionPerMinute: Number(e.target.value) }))}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { days: 30, label: '30 Days Month' },
                      { days: 31, label: '31 Days Month' },
                      { days: 28, label: '28 Days (Feb)' },
                      { days: 26, label: '26 Working Days' }
                    ].map(item => (
                      <button
                        key={item.days}
                        type="button"
                        className="text-[11px] px-2 py-0.5 rounded border bg-card hover:bg-primary hover:text-primary-foreground font-medium transition-colors"
                        onClick={() => {
                          const grossAmt = gross(form);
                          if (grossAmt <= 0) {
                            toast.error('Please enter Basic Salary and allowances first');
                            return;
                          }
                          const calculatedRate = Number((grossAmt / item.days / 8 / 60).toFixed(2));
                          setForm((f: any) => ({ ...f, lateDeductionPerMinute: calculatedRate }));
                          toast.info(`Late rate set to ₹${calculatedRate}/min (${item.label})`);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Calculated as Gross Salary ÷ Days in month ÷ 8 Shift Hours ÷ 60 Mins. Deducted for late punches beyond grace period during smart payroll.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-xs">Effective From</Label>
                  <Input
                    type="date"
                    value={form.effectiveFrom}
                    onChange={e => setForm((f: any) => ({ ...f, effectiveFrom: e.target.value }))}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Wage Code Warning Banner (Req 12) */}
            {(() => {
              const totalAllowances = Object.values(form.allowances as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
              const isInvalid = form.basicSalary > 0 && totalAllowances > form.basicSalary;
              if (isInvalid) {
                return (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Wage Code Compliance Notice (50% Rule)</p>
                      <p>Basic Salary (₹{form.basicSalary}) is less than total allowances (₹{totalAllowances}). Under Indian Wage Code regulations, Basic Salary must be at least 50% of Gross Salary. Total allowances cannot exceed ₹{form.basicSalary}.</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Live preview */}
            <div className="p-3 rounded-xl bg-muted/50 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Basic</p>
                <p className="font-bold text-foreground">₹{form.basicSalary.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross Earnings</p>
                <p className="font-bold text-blue-600">₹{gross(form).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Deductions</p>
                <p className="font-bold text-red-500">
                  ₹{(
                    Object.values(form.deductions as Record<string, number>).reduce((s, v) => s + (v || 0), 0) +
                    (form.professionalTax || 0) +
                    (form.labourWelfareFund || 0)
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Net</p>
                <p className="font-bold text-green-600">₹{net(form).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
