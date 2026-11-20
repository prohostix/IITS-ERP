import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

export function VacanciesPanel() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'hired'>('all');
  const [positionMode, setPositionMode] = useState<'existing' | 'new'>('existing');
  const [formData, setFormData] = useState({
    designationId: '',
    parentDesignationId: '',
    designation: '',
    departmentId: '',
    count: '1',
    status: 'open'
  });

  const [hireFormData, setHireFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });

  useEffect(() => {
    fetchVacancies();
    fetchDepartments();
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      const res = await api.get('/org/designations');
      setDesignations(res.data.data || []);
    } catch {
      // ignore
    }
  };

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hr/vacancies');
      setVacancies(response.data.data || []);
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
      const payload = {
        ...formData,
        designationId: positionMode === 'existing' ? formData.designationId : null,
        parentDesignationId: formData.parentDesignationId || null
      };
      if (editingId) {
        await api.put(`/hr/vacancies/${editingId}`, payload);
        toast.success('Vacancy updated and synced with Org Chart');
      } else {
        await api.post('/hr/vacancies', payload);
        toast.success('Vacancy posted and open position added to Org Chart');
      }
      setDialogOpen(false);
      resetForm();
      fetchVacancies();
      fetchDesignations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save vacancy');
    }
  };

  const handleEdit = (vacancy: any) => {
    const vid = vacancy.id || vacancy.id;
    setEditingId(vid);
    setPositionMode('new');
    setFormData({
      designationId: '',
      parentDesignationId: '',
      designation: vacancy.designation || '',
      departmentId: (typeof vacancy.departmentId === 'object' ? vacancy.departmentId?.id || vacancy.departmentId?.id : vacancy.departmentId) || '',
      count: vacancy.count?.toString() || '1',
      status: vacancy.status || 'open'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vacancy?')) return;
    try {
      await api.delete(`/hr/vacancies/${id}`);
      fetchVacancies();
    } catch (error) {
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this vacancy?')) return;
    try {
      await api.put(`/hr/vacancies/${id}/close`);
      fetchVacancies();
    } catch (error) {
    }
  };

  const openHireDialog = (vacancy: any) => {
    setSelectedVacancy(vacancy);
    setHireFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
    });
    setHireDialogOpen(true);
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const deptId = typeof selectedVacancy.departmentId === 'object'
        ? selectedVacancy.departmentId?.id
        : selectedVacancy.departmentId;
      await api.post('/users', {
        ...hireFormData,
        departmentId: deptId,
        designation: selectedVacancy.designation,
        vacancyId: selectedVacancy.id,
      });
      
      toast.success(`User ${hireFormData.name} hired and assigned to ${selectedVacancy.designation} in the Org Chart!`);
      setHireDialogOpen(false);
      setHireFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
      });
      setSelectedVacancy(null);
      fetchVacancies();
      fetchDesignations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPositionMode(designations.length > 0 ? 'existing' : 'new');
    setFormData({
      designationId: '',
      parentDesignationId: '',
      designation: '',
      departmentId: '',
      count: '1',
      status: 'open'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      open: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vacancy Management</h2>
          <p className="text-muted-foreground">Manage job openings and recruitment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Post Vacancy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Vacancy' : 'Post New Vacancy'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={positionMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setPositionMode('existing')}
                    className="flex-1"
                  >
                    Existing Org Chart Position
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={positionMode === 'new' ? 'default' : 'outline'}
                    onClick={() => { setPositionMode('new'); setFormData(prev => ({ ...prev, designationId: '' })); }}
                    className="flex-1"
                  >
                    + New Position in Hierarchy
                  </Button>
                </div>
              )}

              {positionMode === 'existing' && !editingId ? (
                <div>
                  <Label>Select Position in Org Chart</Label>
                  <Select
                    value={formData.designationId}
                    onValueChange={(val) => {
                      const found = designations.find(d => d.id === val);
                      const deptId = found?.departmentId
                        ? (typeof found.departmentId === 'object' ? found.departmentId.id : found.departmentId)
                        : formData.departmentId;
                      setFormData(prev => ({
                        ...prev,
                        designationId: val,
                        designation: found?.title || prev.designation,
                        departmentId: deptId || prev.departmentId
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose existing Org Chart position..." />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((d) => {
                        const bName = typeof d.branchId === 'object' ? d.branchId?.name : '';
                        const deptName = typeof d.departmentId === 'object' ? d.departmentId?.name : '';
                        const filled = Array.isArray(d.filledBy) ? d.filledBy.length : 0;
                        return (
                          <SelectItem key={d.id} value={d.id}>
                            {d.title} {bName ? `• ${bName}` : (deptName ? `• ${deptName}` : '')} ({filled}/{d.maxHeadcount} filled)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Designation / Job Title</Label>
                    <Input value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required placeholder="e.g., BDE, Team Leader, Software Engineer" />
                  </div>
                  <div>
                    <Label>Reports To (Parent Position in Org Chart)</Label>
                    <Select
                      value={formData.parentDesignationId || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, parentDesignationId: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent position in Org Chart" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Top Level / Department Head</SelectItem>
                        {designations.map((d) => {
                          const holder = Array.isArray(d.filledBy) && d.filledBy[0] ? ` (${d.filledBy[0].name})` : '';
                          return (
                            <SelectItem key={d.id} value={d.id}>
                              {d.title}{holder}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
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
                <Label>Number of Positions</Label>
                <Input type="number" min="1" value={formData.count} onChange={(e) => setFormData({...formData, count: e.target.value})} required />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
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

      {(() => {
        const openCount = vacancies.filter(v => v.status === 'open' && (v.filled || 0) < (v.count || 0)).length;
        const hiredCount = vacancies.filter(v => v.status === 'closed' || (v.filled || 0) >= (v.count || 0)).length;
        const filteredVacancies = vacancies.filter(v => {
          const isClosedOrFull = v.status === 'closed' || (v.filled || 0) >= (v.count || 0);
          if (filterTab === 'open') return v.status === 'open' && !isClosedOrFull;
          if (filterTab === 'hired') return isClosedOrFull;
          return true;
        });

        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle>Vacancy Management</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Filter between live open recruitment and fulfilled/closed positions</p>
              </div>
              <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="w-auto">
                <TabsList className="bg-muted/60">
                  <TabsTrigger value="all">All ({vacancies.length})</TabsTrigger>
                  <TabsTrigger value="open" className="text-green-600 data-[state=active]:bg-green-500/10">
                    Open Hirings ({openCount})
                  </TabsTrigger>
                  <TabsTrigger value="hired" className="text-muted-foreground data-[state=active]:bg-muted">
                    Hired / Closed ({hiredCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading vacancies...</div>
              ) : filteredVacancies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No vacancies matching current filter</div>
              ) : (
                <div className="space-y-4">
                  {filteredVacancies.map((vacancy) => {
                const vid = vacancy.id || vacancy.id || '';
                const deptName = typeof vacancy.departmentId === 'object'
                  ? vacancy.departmentId?.name
                  : vacancy.department?.name;
                const available = (vacancy.count || 0) - (vacancy.filled || 0);
                return (
                <div key={vid} className="p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{vacancy.designation}</h3>
                        {getStatusBadge(vacancy.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {deptName} • {vacancy.count} position(s) • {vacancy.filled || 0} filled • {available} available
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {vacancy.status === 'open' && (
                        <>
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openHireDialog(vacancy)}
                            title="Hire for this position"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Hire
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleClose(vid)}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(vacancy)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(vid)}>
                        <Trash2 className="w-4 h-4" />
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
      );
    })()}

      {/* Hire Dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hire for: {selectedVacancy?.designation}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new employee user for this position in {
                typeof selectedVacancy?.departmentId === 'object'
                  ? selectedVacancy?.departmentId?.name
                  : selectedVacancy?.department?.name
              }
            </p>
          </DialogHeader>
          <form onSubmit={handleHireSubmit} className="space-y-4">
            <div>
              <Label htmlFor="hire-name">Full Name</Label>
              <Input
                id="hire-name"
                value={hireFormData.name}
                onChange={(e) => setHireFormData({ ...hireFormData, name: e.target.value })}
                required
                placeholder="Enter employee name"
              />
            </div>
            <div>
              <Label htmlFor="hire-email">Email</Label>
              <Input
                id="hire-email"
                type="email"
                value={hireFormData.email}
                onChange={(e) => setHireFormData({ ...hireFormData, email: e.target.value })}
                required
                placeholder="employee@company.com"
              />
            </div>
            <div>
              <Label htmlFor="hire-password">Initial Password</Label>
              <Input
                id="hire-password"
                type="password"
                value={hireFormData.password}
                onChange={(e) => setHireFormData({ ...hireFormData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="hire-role">Role</Label>
              <Select
                value={hireFormData.role}
                onValueChange={(value) => setHireFormData({ ...hireFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="bde">BDE</SelectItem>
                  <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                  <SelectItem value="sales_admin">Sales Admin</SelectItem>
                  <SelectItem value="ops_sub_admin">Ops Sub Admin</SelectItem>
                  <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                  <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                  <SelectItem value="front_office_admin">Front Office Admin</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Department:</span> {
                  typeof selectedVacancy?.departmentId === 'object'
                    ? selectedVacancy?.departmentId?.name
                    : selectedVacancy?.department?.name
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                User will be automatically assigned to this department
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User & Hire
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setHireDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
