import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Clock, CheckCircle, Users, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Shift {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  isOpenShift: boolean;
  graceTimeMinutes: number;
  employees?: any[];
}

export function ShiftPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    startTime: string;
    endTime: string;
    isOpenShift: boolean;
    graceTimeMinutes: number;
  }>({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    isOpenShift: false,
    graceTimeMinutes: 15,
  });

  // Bulk & Individual Shift / Late Deduction Management
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkShiftId, setBulkShiftId] = useState<string>('');
  const [assigningBulk, setAssigningBulk] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [shiftsRes, usersRes, deptsRes] = await Promise.all([
        api.get('/attendance/shifts'),
        api.get('/users?status=active'),
        api.get('/departments').catch(() => ({ data: { data: [] } })),
      ]);
      setShifts(shiftsRes.data?.data || []);
      const rawUsers = usersRes.data?.data || [];
      setEmployees(
        rawUsers.filter(
          (u: any) => !['superadmin', 'ceo', 'center_admin', 'student', 'university_admin'].includes(u.role)
        )
      );
      setDepartments(deptsRes.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load shift settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Shift name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        isOpenShift: Boolean(form.isOpenShift),
        startTime: form.isOpenShift ? null : (form.startTime || '09:00'),
        endTime: form.isOpenShift ? null : (form.endTime || '18:00'),
        graceTimeMinutes: Math.max(0, Number(form.graceTimeMinutes ?? 15)),
      };
      if (form.id) {
        await api.put(`/attendance/shifts/${form.id}`, payload);
        toast.success('Shift updated successfully');
      } else {
        await api.post('/attendance/shifts', payload);
        toast.success('Shift created successfully');
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift? Assigned employees will revert to default office hours.')) return;
    try {
      await api.delete(`/attendance/shifts/${id}`);
      toast.success('Shift deleted');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete shift');
    }
  };

  const openEdit = (shift: Shift) => {
    setForm({
      id: shift.id,
      name: shift.name || '',
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '18:00',
      isOpenShift: Boolean(shift.isOpenShift),
      graceTimeMinutes: Number(shift.graceTimeMinutes ?? 15),
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setForm({
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      isOpenShift: false,
      graceTimeMinutes: 15,
    });
    setDialogOpen(true);
  };

  const handleAssignIndividualShift = async (employeeId: string, newShiftId: string) => {
    try {
      await api.post('/attendance/shifts/assign', {
        employeeId,
        shiftId: newShiftId === 'default' ? null : newShiftId,
      });
      toast.success('Employee shift updated');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign shift');
    }
  };

  const handleToggleLateDeduction = async (emp: any, enabled: boolean) => {
    // Optimistic update
    setEmployees(prev =>
      prev.map(u =>
        u.id === emp.id
          ? {
              ...u,
              employeeProfileDetail: { ...(u.employeeProfileDetail || {}), lateDeductionEnabled: enabled },
              salaryConfig: u.salaryConfig ? { ...u.salaryConfig, lateDeductionEnabled: enabled } : u.salaryConfig,
            }
          : u
      )
    );
    try {
      await api.put(`/attendance/late-deduction/${emp.id}`, { enabled });
      toast.success(`Late deduction ${enabled ? 'enabled' : 'disabled'} for ${emp.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update late deduction setting');
      fetchAll();
    }
  };

  const handleBulkAssign = async () => {
    if (selectedEmpIds.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    if (!bulkShiftId) {
      toast.error('Please select a target shift');
      return;
    }
    setAssigningBulk(true);
    try {
      await api.post('/attendance/shifts/assign', {
        employeeIds: selectedEmpIds,
        shiftId: bulkShiftId === 'default' ? null : bulkShiftId,
      });
      toast.success(`Assigned shift to ${selectedEmpIds.length} employee(s)`);
      setSelectedEmpIds([]);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to bulk assign shift');
    } finally {
      setAssigningBulk(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(u => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchDesig = (u.designation || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDesig) return false;
      }
      if (deptFilter !== 'all') {
        const dId = u.department?.id || u.departmentId;
        if (dId !== deptFilter) return false;
      }
      const empShiftId = u.employeeProfileDetail?.shiftId || 'default';
      if (shiftFilter !== 'all' && empShiftId !== shiftFilter) {
        return false;
      }
      return true;
    });
  }, [employees, searchQuery, deptFilter, shiftFilter]);

  const allFilteredSelected =
    filteredEmployees.length > 0 && filteredEmployees.every(u => selectedEmpIds.includes(u.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredEmployees.map(u => u.id));
      setSelectedEmpIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedEmpIds);
      filteredEmployees.forEach(u => next.add(u.id));
      setSelectedEmpIds(Array.from(next));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Shift & Employee Late Deduction Management</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create shifts with custom timings & grace periods, assign staff, and enable/disable late deductions per employee.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Shift
          </Button>
        </div>
      </div>

      {/* Shift Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading shifts...</div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
          No custom shifts created yet. Click <strong>Add Shift</strong> to define Morning, Evening, General, or Open shifts.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map(shift => {
            const assignedCount =
              employees.filter(u => u.employeeProfileDetail?.shiftId === shift.id).length ||
              shift.employees?.length ||
              0;
            return (
              <Card key={shift.id} className="shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 relative">
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(shift)}
                      className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                      title="Edit Shift"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(shift.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
                      title="Delete Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-base flex items-center gap-2 pr-14">
                    {shift.isOpenShift ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-primary shrink-0" />
                    )}
                    {shift.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-sm">
                    {shift.isOpenShift ? (
                      <div className="flex justify-between items-center py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Schedule:</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Open / Flexible Shift (No Late Penalty)
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Shift Timing:</span>
                        <span className="font-semibold">{shift.startTime || '09:00'} – {shift.endTime || '18:00'}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Grace Period:</span>
                      <span className="font-medium">{shift.isOpenShift ? 'N/A (Flexible)' : `${shift.graceTimeMinutes} mins`}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Assigned Staff:
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary"
                        onClick={() => setShiftFilter(shiftFilter === shift.id ? 'all' : shift.id)}
                      >
                        {assignedCount} employee{assignedCount === 1 ? '' : 's'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Employee Shift Assignment & Individual Late Deduction Toggle Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Employee Shift Assignment & Late Deduction Controls</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign shifts to individual employees or in bulk, and enable/disable late arrival salary deductions individually.
              </p>
            </div>
            {selectedEmpIds.length > 0 && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-semibold text-primary">{selectedEmpIds.length} selected</span>
                <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
                  <SelectTrigger className="h-8 w-48 bg-background text-xs">
                    <SelectValue placeholder="Choose shift..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Office Hours</SelectItem>
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.isOpenShift ? '(Open)' : `(${s.startTime}-${s.endTime})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8" disabled={assigningBulk || !bulkShiftId} onClick={handleBulkAssign}>
                  {assigningBulk ? 'Assigning...' : 'Apply Shift'}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employee name, email, designation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger><SelectValue placeholder="All Shifts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="default">Default Office Hours (Unassigned)</SelectItem>
                {shifts.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </th>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Department / Role</th>
                  <th className="p-3 text-left">Assigned Shift</th>
                  <th className="p-3 text-left">Late Deduction</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No employees match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const currentShiftId = emp.employeeProfileDetail?.shiftId || 'default';
                    const isLateEnabled =
                      (emp.salaryConfig?.lateDeductionEnabled ??
                        emp.employeeProfileDetail?.lateDeductionEnabled ??
                        true) !== false;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/20">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedEmpIds.includes(emp.id)}
                            onChange={() =>
                              setSelectedEmpIds(prev =>
                                prev.includes(emp.id) ? prev.filter(i => i !== emp.id) : [...prev, emp.id]
                              )
                            }
                            className="w-4 h-4 accent-primary rounded"
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-xs font-medium">{emp.department?.name || 'Unassigned'}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {emp.designation || (emp.role || '').replace(/_/g, ' ')}
                          </p>
                        </td>
                        <td className="p-3">
                          <Select
                            value={currentShiftId}
                            onValueChange={val => handleAssignIndividualShift(emp.id, val)}
                          >
                            <SelectTrigger className="h-8 w-52 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default Office Hours</SelectItem>
                              {shifts.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} {s.isOpenShift ? '(Open)' : `(${s.startTime}-${s.endTime})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Switch
                              checked={isLateEnabled}
                              onCheckedChange={checked => handleToggleLateDeduction(emp, checked)}
                            />
                            {isLateEnabled ? (
                              <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                                Deduction Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                Exempt (No Deduction)
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label>Shift Name</Label>
              <Input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Morning Shift, General Shift, Night Shift"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Open Shift (Flexible Timings)</p>
                <p className="text-xs text-muted-foreground">Employees on an open shift are never marked late</p>
              </div>
              <Switch
                checked={form.isOpenShift}
                onCheckedChange={checked => setForm({ ...form, isOpenShift: checked })}
              />
            </div>
            {!form.isOpenShift && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      required
                      value={form.startTime || '09:00'}
                      onChange={e => setForm({ ...form, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      required
                      value={form.endTime || '18:00'}
                      onChange={e => setForm({ ...form, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Grace Period (Minutes)</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    max="180"
                    value={form.graceTimeMinutes}
                    onChange={e => setForm({ ...form, graceTimeMinutes: Math.max(0, Number(e.target.value)) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minutes allowed after {form.startTime || '09:00'} before late arrival & salary deduction apply
                  </p>
                </div>
              </>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Shift'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
