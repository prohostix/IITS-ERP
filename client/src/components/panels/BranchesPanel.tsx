import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, RefreshCw, Edit2, Trash2, UserPlus, MapPin, Building2, TrendingUp, Settings, Layers } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Dept { id: string; name: string; type: string; }

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive';
  branchManagerId?: { id: string; name: string; email: string; role: string; userId?: string; designation?: string };
  salesDeptId?: Dept;
  operationsDeptId?: Dept;
  additionalDeptIds?: Dept[];
}

interface OrgUser {
  id: string; name: string; email: string; role: string; userId?: string; designation?: string;
}

const DEPT_TYPE_COLORS: Record<string, string> = {
  sales: '#ca8a04', operations: '#ea580c', finance: '#16a34a',
  hr: '#db2777', ceo: '#2563eb', custom: '#6366f1',
};

export function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allDepts, setAllDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create / Edit dialog
  const [branchDialog, setBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '', branchManagerId: '',
  });

  // Assign manager dialog (includes dept selection)
  const [managerDialog, setManagerDialog] = useState(false);
  const [managerTarget, setManagerTarget] = useState<Branch | null>(null);
  const [managerUserId, setManagerUserId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // Manage departments dialog (for existing branch, no manager change)
  const [deptDialog, setDeptDialog] = useState(false);
  const [deptTarget, setDeptTarget] = useState<Branch | null>(null);
  const [deptSelection, setDeptSelection] = useState<string[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [branchRes, userRes, deptRes] = await Promise.all([
        api.get('/org/branches'),
        api.get('/users'),
        api.get('/departments'),
      ]);
      setBranches(branchRes.data.data || []);
      setAllUsers(userRes.data.data || []);
      setAllDepts(deptRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Depts available as "additional" — excludes auto-created branch depts AND finance/hr (those are org-wide)
  const RESTRICTED_TYPES = new Set(['finance', 'hr']);

  const getAvailableExtraDepts = (branch: Branch | null) => {
    const autoIds = new Set<string>();
    branches.forEach(b => {
      if (b.salesDeptId) autoIds.add(b.salesDeptId.id);
      if (b.operationsDeptId) autoIds.add(b.operationsDeptId.id);
    });
    if (branch?.salesDeptId) autoIds.add(branch.salesDeptId.id);
    if (branch?.operationsDeptId) autoIds.add(branch.operationsDeptId.id);
    return allDepts.filter(d => !autoIds.has(d.id) && !RESTRICTED_TYPES.has(d.type));
  };

  const toggleDept = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  // ── Create / Edit ──
  const openCreate = () => {
    setEditingBranch(null);
    setForm({ name: '', code: '', address: '', city: '', state: '', branchManagerId: '' });
    setBranchDialog(true);
  };

  const openEdit = (b: Branch) => {
    setEditingBranch(b);
    setForm({ name: b.name, code: b.code, address: b.address, city: b.city || '', state: b.state || '', branchManagerId: '' });
    setBranchDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.address) {
      toast.error('Name, branch code, and address are required'); return;
    }
    setSaving(true);
    try {
      if (editingBranch) {
        await api.patch(`/org/branches/${editingBranch.id}`, {
          name: form.name, address: form.address, city: form.city, state: form.state,
        });
      } else {
        await api.post('/org/branches', {
          name: form.name, code: form.code, address: form.address,
          city: form.city, state: form.state,
          branchManagerId: form.branchManagerId || undefined,
        });
      }
      toast.success(editingBranch ? 'Branch updated' : 'Branch created with Sales & Operations departments');
      setBranchDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Branch) => {
    if (!confirm(`Delete branch "${b.name}"? This will also remove its Sales and Operations departments.`)) return;
    try {
      await api.delete(`/org/branches/${b.id}`);
      toast.success('Branch deleted');
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete branch');
    }
  };

  // ── Assign Manager ──
  const openAssignManager = (b: Branch) => {
    setManagerTarget(b);
    setManagerUserId(b.branchManagerId?.id || '');
    setSelectedDeptIds((b.additionalDeptIds || []).map(d => d.id));
    setManagerDialog(true);
  };

  const handleAssignManager = async () => {
    if (!managerTarget) return;
    setSaving(true);
    try {
      await api.patch(`/org/branches/${managerTarget.id}/manager`, {
        userId: managerUserId || null,
        additionalDeptIds: selectedDeptIds,
      });
      toast.success('Branch manager updated');
      setManagerDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign manager');
    } finally {
      setSaving(false);
    }
  };

  // ── Manage Departments (no manager change) ──
  const openManageDepts = (b: Branch) => {
    setDeptTarget(b);
    setDeptSelection((b.additionalDeptIds || []).map(d => d.id));
    setDeptDialog(true);
  };

  const handleSaveDepts = async () => {
    if (!deptTarget) return;
    setSaving(true);
    try {
      await api.patch(`/org/branches/${deptTarget.id}/departments`, {
        additionalDeptIds: deptSelection,
      });
      toast.success('Branch departments updated');
      setDeptDialog(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update departments');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (b: Branch) => {
    try {
      await api.patch(`/org/branches/${b.id}`, { status: b.status === 'active' ? 'inactive' : 'active' });
      fetchAll();
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading branches...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Branches</h2>
          <p className="text-muted-foreground text-sm">
            Manage organization branches and departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="flex-1 sm:flex-none">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setBranchDialog(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            New Branch
          </Button>
        </div>
      </div>

      {/* Branch cards */}
      {branches.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No branches yet.</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Create First Branch</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(b => (
            <div key={b.id}
              className={`border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow ${b.status === 'inactive' ? 'opacity-60' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{b.code}</span>
                    <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className="text-xs">{b.status}</Badge>
                  </div>
                  <h3 className="font-bold text-base mt-1">{b.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {b.address}{b.city ? `, ${b.city}` : ''}{b.state ? `, ${b.state}` : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-indigo-50 text-indigo-600">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(b)} className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-red-50 text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Branch Manager */}
              <div className="mb-3 p-3 rounded-lg bg-slate-50 border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch Manager</span>
                  <button onClick={() => openAssignManager(b)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />{b.branchManagerId ? 'Change' : 'Assign'}
                  </button>
                </div>
                {b.branchManagerId ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {b.branchManagerId.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.branchManagerId.name}</p>
                      <p className="text-xs text-muted-foreground">{b.branchManagerId.designation || b.branchManagerId.role.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">No manager assigned</p>
                )}
              </div>

              {/* Departments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Departments</p>
                  <button onClick={() => openManageDepts(b)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Manage
                  </button>
                </div>

                {/* Auto depts */}
                <div className="flex gap-2">
                  {b.salesDeptId && (
                    <div className="flex-1 flex items-center gap-2 p-2 rounded-lg border"
                      style={{ borderColor: DEPT_TYPE_COLORS.sales + '44', background: DEPT_TYPE_COLORS.sales + '11' }}>
                      <TrendingUp className="h-4 w-4 shrink-0" style={{ color: DEPT_TYPE_COLORS.sales }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: DEPT_TYPE_COLORS.sales }}>Sales</p>
                        <p className="text-[10px] text-muted-foreground truncate">{b.salesDeptId.name}</p>
                      </div>
                    </div>
                  )}
                  {b.operationsDeptId && (
                    <div className="flex-1 flex items-center gap-2 p-2 rounded-lg border"
                      style={{ borderColor: DEPT_TYPE_COLORS.operations + '44', background: DEPT_TYPE_COLORS.operations + '11' }}>
                      <Settings className="h-4 w-4 shrink-0" style={{ color: DEPT_TYPE_COLORS.operations }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: DEPT_TYPE_COLORS.operations }}>Operations</p>
                        <p className="text-[10px] text-muted-foreground truncate">{b.operationsDeptId.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional depts */}
                {(b.additionalDeptIds || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(b.additionalDeptIds || []).map(d => (
                      <span key={d.id} className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                        style={{
                          borderColor: (DEPT_TYPE_COLORS[d.type] || '#6366f1') + '55',
                          background: (DEPT_TYPE_COLORS[d.type] || '#6366f1') + '11',
                          color: DEPT_TYPE_COLORS[d.type] || '#6366f1',
                        }}>
                        {d.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => toggleStatus(b)}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground border rounded-lg py-1.5 transition-colors">
                {b.status === 'active' ? 'Deactivate branch' : 'Activate branch'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Branch Name *</Label>
              <Input placeholder="e.g. Delhi North Branch" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            {!editingBranch && (
              <div className="space-y-1">
                <Label>Branch Code *</Label>
                <Input placeholder="e.g. DEL-N" value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Location / Address *</Label>
              <Input placeholder="Street address or area" value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input placeholder="City" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input placeholder="State" value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            {!editingBranch && (
              <>
                <div className="space-y-1">
                  <Label>Branch Manager (optional)</Label>
                  <Select value={form.branchManagerId || '__none__'}
                    onValueChange={v => setForm(p => ({ ...p, branchManagerId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Assign later..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Assign later</SelectItem>
                      {allUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {u.role.replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2">
                  Creating this branch will automatically generate a <strong>Sales</strong> and <strong>Operations</strong> department for it.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.code || !form.address}>
              {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Manager Dialog ── */}
      <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Branch Manager — {managerTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Manager</Label>
              <Select value={managerUserId || '__none__'}
                onValueChange={v => setManagerUserId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Choose a person..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Remove manager</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.role.replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional departments */}
            <div className="space-y-2">
              <Label>Additional Department Access</Label>
              <p className="text-xs text-muted-foreground">
                Sales and Operations are always included. Select any extra departments this manager should access.
              </p>
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {/* Always-included auto depts (disabled) */}
                  {managerTarget?.salesDeptId && (
                    <div className="flex items-center gap-2 opacity-50">
                      <Checkbox checked disabled />
                      <span className="text-sm">{managerTarget.salesDeptId.name}</span>
                      <span className="text-xs text-muted-foreground">(auto)</span>
                    </div>
                  )}
                  {managerTarget?.operationsDeptId && (
                    <div className="flex items-center gap-2 opacity-50">
                      <Checkbox checked disabled />
                      <span className="text-sm">{managerTarget.operationsDeptId.name}</span>
                      <span className="text-xs text-muted-foreground">(auto)</span>
                    </div>
                  )}
                  {/* Selectable extra depts */}
                  {getAvailableExtraDepts(managerTarget).map(d => (
                    <div key={d.id} className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleDept(d.id, selectedDeptIds, setSelectedDeptIds)}>
                      <Checkbox checked={selectedDeptIds.includes(d.id)}
                        onCheckedChange={() => toggleDept(d.id, selectedDeptIds, setSelectedDeptIds)} />
                      <span className="text-sm">{d.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{d.type}</span>
                    </div>
                  ))}
                  {getAvailableExtraDepts(managerTarget).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No other departments available</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignManager} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Departments Dialog ── */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Departments — {deptTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select which additional departments the branch manager can access beyond Sales and Operations.
            </p>
            <ScrollArea className="h-56 border rounded-lg p-3">
              <div className="space-y-2">
                {deptTarget?.salesDeptId && (
                  <div className="flex items-center gap-2 opacity-50">
                    <Checkbox checked disabled />
                    <span className="text-sm">{deptTarget.salesDeptId.name}</span>
                    <span className="text-xs text-muted-foreground">(auto)</span>
                  </div>
                )}
                {deptTarget?.operationsDeptId && (
                  <div className="flex items-center gap-2 opacity-50">
                    <Checkbox checked disabled />
                    <span className="text-sm">{deptTarget.operationsDeptId.name}</span>
                    <span className="text-xs text-muted-foreground">(auto)</span>
                  </div>
                )}
                {getAvailableExtraDepts(deptTarget).map(d => (
                  <div key={d.id} className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleDept(d.id, deptSelection, setDeptSelection)}>
                    <Checkbox checked={deptSelection.includes(d.id)}
                      onCheckedChange={() => toggleDept(d.id, deptSelection, setDeptSelection)} />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{d.type}</span>
                  </div>
                ))}
                {getAvailableExtraDepts(deptTarget).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No other departments available</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDepts} disabled={saving}>
              {saving ? 'Saving...' : 'Save Departments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
