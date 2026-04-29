import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TargetsPanelProps {
  endpoint: string; // '/finance/targets' or '/sales/targets'
  title?: string;
}

export function TargetsPanel({ endpoint, title = 'Target Management' }: TargetsPanelProps) {
  const { user } = useAuth();
  const canManage = user?.role === 'sales_admin' || user?.role === 'ceo' || user?.role === 'org_admin' || user?.role === 'superadmin';

  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    departmentId: '',
    target: '',
    achieved: '0',
    period: 'monthly',
    type: 'revenue'
  });

  useEffect(() => {
    fetchTargets();
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      setTargets(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      target: Number(formData.target),
      achieved: Number(formData.achieved),
      period: formData.period,
      type: formData.type
    };
    if (formData.employeeId && formData.employeeId !== 'none') payload.employeeId = formData.employeeId;
    if (formData.departmentId && formData.departmentId !== 'none') payload.departmentId = formData.departmentId;

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save target');
    }
  };

  const handleEdit = (t: any) => {
    const empId = typeof t.employeeId === 'object' ? (t.employeeId?.id || t.employeeId?.id) : t.employeeId;
    const deptId = typeof t.departmentId === 'object' ? (t.departmentId?.id || t.departmentId?.id) : t.departmentId;
    setEditingId(t.id || t.id);
    setFormData({
      employeeId: empId?.toString() || '',
      departmentId: deptId?.toString() || '',
      target: t.target?.toString() || '',
      achieved: t.achieved?.toString() || '0',
      period: t.period || 'monthly',
      type: t.type || 'revenue'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete target');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ employeeId: '', departmentId: '', target: '', achieved: '0', period: 'monthly', type: 'revenue' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">Set and track performance targets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          {canManage && (
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Target</Button>
          </DialogTrigger>
          )}
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Target' : 'Add New Target'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee (optional)</Label>
                  <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees.filter(e => e && (e.id || e.id)).map((e) => (
                        <SelectItem key={e.id || e.id} value={(e.id || e.id).toString()}>
                          {e.name || e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department (optional)</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.filter(d => d && (d.id || d.id)).map((d) => (
                        <SelectItem key={d.id || d.id} value={(d.id || d.id).toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Amount</Label>
                  <Input type="number" min="0" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} required />
                </div>
                <div>
                  <Label>Achieved Amount</Label>
                  <Input type="number" min="0" value={formData.achieved} onChange={(e) => setFormData({ ...formData, achieved: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Period</Label>
                  <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="centers">Centers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        <CardHeader><CardTitle>Targets</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No targets found</div>
          ) : (
            <div className="space-y-4">
              {targets.filter(t => t && (t.id || t.id)).map((t) => {
                const tid = t.id || t.id;
                const pct = t.target ? Math.min(100, ((t.achieved || 0) / t.target) * 100) : 0;
                const empName = typeof t.employeeId === 'object' ? t.employeeId?.name : '';
                const deptName = typeof t.departmentId === 'object' ? t.departmentId?.name : '';
                return (
                  <div key={tid} className="p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{empName || deptName || 'General Target'}</div>
                          <div className="text-sm text-muted-foreground">{t.type} • {t.period}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(tid)}><Trash2 className="w-4 h-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{t.achieved || 0} / {t.target}</span>
                        <span className="font-bold">{pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={pct} />
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
