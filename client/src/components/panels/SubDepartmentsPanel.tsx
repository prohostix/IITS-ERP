import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, Users, BookOpen, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SubDepartment {
  id?: string;
  name: string;
  parentDeptId: any;
  managerId?: any;
  assignedUniversities?: any[];
  assignedPrograms?: any[];
  assignedCenters?: any[];
  status: string;
}

export function SubDepartmentsPanel() {
  const { user } = useAuth();
  const canManage = ['ops_admin', 'sales_admin', 'org_admin', 'superadmin'].includes(user?.role || '');

  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubDept, setEditingSubDept] = useState<SubDepartment | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    parentDeptId: '',
    managerId: '',
    assignedUniversities: [] as string[],
    assignedPrograms: [] as string[],
    assignedCenters: [] as string[],
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sdRes, deptRes, userRes, uniRes, progRes, centerRes] = await Promise.all([
        api.get('/sub-departments'),
        api.get('/departments'),
        api.get('/users'),
        api.get('/operations/universities').catch(() => ({ data: { data: [] } })),
        api.get('/operations/programs').catch(() => ({ data: { data: [] } })),
        api.get('/operations/centers').catch(() => ({ data: { data: [] } })),
      ]);
      setSubDepartments(sdRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setUsers(userRes.data.data || []);
      setUniversities(uniRes.data.data || []);
      setPrograms(progRes.data.data || []);
      setCenters(centerRes.data.data || []);
    } catch (e) {
      console.error('Failed to fetch sub-departments data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (field: 'assignedUniversities' | 'assignedPrograms' | 'assignedCenters', id: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(id) ? prev[field].filter(x => x !== id) : [...prev[field], id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubDept) {
        const subDeptId = editingSubDept.id || editingSubDept.id;
        await api.patch(`/sub-departments/${subDeptId}`, {
          managerId: (formData.managerId && formData.managerId !== 'none') ? formData.managerId : null,
          assignedUniversities: formData.assignedUniversities,
          assignedPrograms: formData.assignedPrograms,
          assignedCenters: formData.assignedCenters,
        });
        toast.success('Sub-department updated');
      } else {
        await api.post('/sub-departments', {
          name: formData.name,
          parentDeptId: formData.parentDeptId,
          managerId: (formData.managerId && formData.managerId !== 'none') ? formData.managerId : undefined,
          assignedUniversities: formData.assignedUniversities,
          assignedPrograms: formData.assignedPrograms,
          assignedCenters: formData.assignedCenters,
        });
        toast.success('Sub-department created');
      }
      setDialogOpen(false);
      resetForm();
      fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save sub-department');
    }
  };

  const handleDelete = async (subDeptId: string) => {
    if (!confirm('Delete this sub-department?')) return;
    try {
      await api.delete(`/sub-departments/${subDeptId}`);
      toast.success('Sub-department deleted');
      fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const openEditDialog = (sd: SubDepartment) => {
    setEditingSubDept(sd);
    const parentId = typeof sd.parentDeptId === 'object' ? (sd.parentDeptId?.id || '') : sd.parentDeptId;
    const managerId = typeof sd.managerId === 'object' ? (sd.managerId?.id || '') : (sd.managerId || '');
    const toIds = (arr: any[]) => arr.map((x: any) => typeof x === 'object' ? (x.id || x.id) : x).filter(Boolean);
    setFormData({
      name: sd.name,
      parentDeptId: parentId,
      managerId,
      assignedUniversities: toIds(sd.assignedUniversities || []),
      assignedPrograms: toIds(sd.assignedPrograms || []),
      assignedCenters: toIds(sd.assignedCenters || []),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', parentDeptId: '', managerId: '', assignedUniversities: [], assignedPrograms: [], assignedCenters: [] });
    setEditingSubDept(null);
  };

  if (loading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading sub-departments...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sub-Department Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Create and manage sub-departments with assigned resources</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Sub-Department</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSubDept ? 'Edit Sub-Department' : 'Create Sub-Department'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. OpenSchool Sales"
                      required
                      disabled={!!editingSubDept}
                    />
                  </div>
                  <div>
                    <Label>Parent Department</Label>
                    <Select
                      value={formData.parentDeptId}
                      onValueChange={(v) => setFormData({ ...formData, parentDeptId: v })}
                      required
                      disabled={!!editingSubDept}
                    >
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id || d.id} value={(d.id || d.id)!}>{d.name} ({d.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Manager</Label>
                  <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id || u.id} value={(u.id || u.id)!}>
                          {u.name} {u.designation ? `(${u.designation})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="universities" className="space-y-2">
                  <TabsList className="h-auto flex-wrap gap-1">
                    <TabsTrigger value="universities">Universities ({formData.assignedUniversities.length})</TabsTrigger>
                    <TabsTrigger value="programs">Programs ({formData.assignedPrograms.length})</TabsTrigger>
                    <TabsTrigger value="centers">Study Centers ({formData.assignedCenters.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="universities">
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {universities.length === 0 ? <p className="text-sm text-muted-foreground">No universities found</p> :
                        universities.map((u: any) => (
                          <div key={u.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`uni-${u.id}`}
                              checked={formData.assignedUniversities.includes(u.id)}
                              onCheckedChange={() => toggle('assignedUniversities', u.id)}
                            />
                            <label htmlFor={`uni-${u.id}`} className="text-sm cursor-pointer">{u.name} <span className="text-muted-foreground">({u.code})</span></label>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="programs">
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {programs.length === 0 ? <p className="text-sm text-muted-foreground">No programs found</p> :
                        programs.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`prog-${p.id}`}
                              checked={formData.assignedPrograms.includes(p.id)}
                              onCheckedChange={() => toggle('assignedPrograms', p.id)}
                            />
                            <label htmlFor={`prog-${p.id}`} className="text-sm cursor-pointer">{p.name} <span className="text-muted-foreground">({p.code})</span></label>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="centers">
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {centers.length === 0 ? <p className="text-sm text-muted-foreground">No study centers found</p> :
                        centers.map((c: any) => (
                          <div key={c.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`ctr-${c.id}`}
                              checked={formData.assignedCenters.includes(c.id)}
                              onCheckedChange={() => toggle('assignedCenters', c.id)}
                            />
                            <label htmlFor={`ctr-${c.id}`} className="text-sm cursor-pointer">{c.name} <span className="text-muted-foreground">({c.code})</span></label>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit">{editingSubDept ? 'Update' : 'Create'} Sub-Department</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {subDepartments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No sub-departments found</p>
            <p className="text-sm">Create your first sub-department to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subDepartments.map((sd) => {
              const sdId = sd.id || sd.id || '';
              const parentName = typeof sd.parentDeptId === 'object' ? sd.parentDeptId?.name : null;
              const managerName = typeof sd.managerId === 'object' ? sd.managerId?.name : null;
              const unis = sd.assignedUniversities || [];
              const progs = sd.assignedPrograms || [];
              const ctrs = sd.assignedCenters || [];
              return (
                <div key={sdId} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold">{sd.name}</h3>
                        <Badge variant="outline">{parentName || 'Unknown Parent'}</Badge>
                        <Badge className={sd.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{sd.status}</Badge>
                      </div>
                      {managerName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <Users className="w-3 h-3" /> {managerName}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{unis.length} universities</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{progs.length} programs</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ctrs.length} centers</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(sd)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(sdId)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
