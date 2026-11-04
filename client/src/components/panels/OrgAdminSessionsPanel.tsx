import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, PowerOff, CheckCircle2, Search, Filter, University, BookOpen, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function OrgAdminSessionsPanel() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    universityId: '',
    programId: '',
    startDate: '',
    endDate: '',
    capacity: 0,
    status: 'active'
  });

  useEffect(() => {
    fetchSessions();
    fetchUniversities();
    fetchPrograms();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/sessions');
      setSessions(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (err) {
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
    }
  };

  const filteredPrograms = formData.universityId
    ? programs.filter(p => p.universityId === formData.universityId || p.university?.id === formData.universityId)
    : programs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.universityId || formData.universityId === 'none') {
      toast.error('Please select a university. Sessions must be added against a university.');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        universityId: formData.universityId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        capacity: formData.capacity ? parseInt(String(formData.capacity)) : 0,
        status: formData.status
      };

      if (formData.programId && formData.programId !== 'none') {
        payload.programId = formData.programId;
      } else {
        payload.programId = null;
      }

      if (editingId) {
        await api.put(`/operations/sessions/${editingId}`, payload);
        toast.success('Session updated successfully');
      } else {
        await api.post('/operations/sessions', payload);
        toast.success('Session created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save session');
    }
  };

  const handleToggleStatus = async (session: any) => {
    const sid = session.id;
    const currentStatus = session.status || 'inactive';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    // Optimistic UI update
    setSessions(prev => prev.map(s => (s.id === sid ? { ...s, status: nextStatus } : s)));

    try {
      const res = await api.patch(`/operations/sessions/${sid}/toggle-status`);
      toast.success(res.data?.message || `Session ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update session status');
      fetchSessions();
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setFormData({
      name: s.name || '',
      universityId: s.universityId || '',
      programId: s.programId || '',
      startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
      endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
      capacity: s.capacity || 0,
      status: s.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this admission session?')) return;
    try {
      await api.delete(`/operations/sessions/${id}`);
      toast.success('Session deleted successfully');
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete session');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      universityId: '',
      programId: '',
      startDate: '',
      endDate: '',
      capacity: 0,
      status: 'active'
    });
  };

  // Filtered sessions
  const visibleSessions = sessions.filter(s => {
    if (filterUniversity !== 'all' && s.universityId !== filterUniversity) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchUni = (s.university?.name || universities.find(u => u.id === s.universityId)?.name || '').toLowerCase().includes(q);
      if (!matchName && !matchUni) return false;
    }
    return true;
  });

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const inactiveCount = sessions.filter(s => s.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Header and Add Modal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admission Sessions</h2>
          <p className="text-muted-foreground text-sm">
            Configure admission batches per university. Only <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span> sessions appear to study centers during student enrollment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {activeCount} Active
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted font-medium">
              {inactiveCount} Inactive
            </span>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="premium-gradient text-white shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />Add Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Admission Session' : 'Create Admission Session'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <Label>Session Name / Batch <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="e.g. 2026-2027 July Batch" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>University <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.universityId} 
                      onValueChange={(v) => setFormData({ ...formData, universityId: v, programId: '' })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select University" />
                      </SelectTrigger>
                      <SelectContent>
                        {universities.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">Sessions must be assigned to a specific university</p>
                  </div>

                  <div>
                    <Label>Program (Optional)</Label>
                    <Select 
                      value={formData.programId || 'none'} 
                      onValueChange={(v) => setFormData({ ...formData, programId: v === 'none' ? '' : v })}
                      disabled={!formData.universityId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.universityId ? "All Programs in University" : "Select University First"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Programs</SelectItem>
                        {filteredPrograms.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">Leave as All Programs to apply across university</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      value={formData.startDate} 
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <Label>End Date <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      value={formData.endDate} 
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Capacity Limit (Optional)</Label>
                    <Input 
                      type="number" 
                      placeholder="Unlimited" 
                      value={formData.capacity || ''} 
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : 0 })} 
                    />
                  </div>

                  <div>
                    <Label>Initial Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Visible to Centers)</SelectItem>
                        <SelectItem value="inactive">Inactive (Hidden from Centers)</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 premium-gradient text-white">Save Session</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search session name or university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div>
              <Select value={filterUniversity} onValueChange={setFilterUniversity}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2 truncate">
                    <University className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="All Universities" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {universities.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="closed">Closed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configured Sessions</CardTitle>
              <CardDescription>
                Showing {visibleSessions.length} of {sessions.length} sessions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-2">
              <Calendar className="w-8 h-8 opacity-40 animate-spin" />
              <span>Loading admission sessions...</span>
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Layers className="w-10 h-10 opacity-30" />
              <p className="font-medium">No admission sessions found</p>
              <p className="text-xs">Adjust your search or click "Add Session" above to create one against a university.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSessions.map((s) => {
                const uni = s.university || universities.find(u => u.id === s.universityId);
                const uniName = uni?.name || 'No University Assigned';
                const prog = s.program || programs.find(p => p.id === s.programId);
                const programName = prog?.name || 'All Programs';
                const isActive = s.status === 'active';

                return (
                  <div 
                    key={s.id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl transition-all gap-4 ${
                      isActive ? 'bg-card hover:bg-muted/40 border-border/80' : 'bg-muted/20 opacity-80 border-dashed border-border'
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Calendar className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-base text-foreground">{s.name}</span>

                          {/* Status Badge */}
                          {isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 px-2 py-0.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-dashed bg-muted/30 px-2 py-0.5">
                              {s.status === 'inactive' ? 'Inactive' : s.status}
                            </Badge>
                          )}

                          {/* University Badge */}
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs flex items-center gap-1">
                            <University className="w-3 h-3" />
                            {uniName}
                          </Badge>

                          {s.programId && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {programName}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            <strong className="text-foreground/80 font-medium">Dates:</strong> {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                          </span>
                          {s.capacity ? (
                            <span>
                              <strong className="text-foreground/80 font-medium">Capacity:</strong> {s.capacity} seats
                            </span>
                          ) : (
                            <span>
                              <strong className="text-foreground/80 font-medium">Capacity:</strong> Unlimited
                            </span>
                          )}
                          <span className="text-[11px] opacity-75">
                            Created: {new Date(s.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Activate/Deactivate Toggle and Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(s)}
                          className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 text-xs font-medium gap-1.5 h-8 px-3 transition-colors"
                          title="Deactivate this session (will hide from centers)"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleToggleStatus(s)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-medium gap-1.5 h-8 px-3 transition-all"
                          title="Activate this session (will show to centers)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activate
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(s)}
                        className="h-8 w-8 p-0"
                        title="Edit Session"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(s.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
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
