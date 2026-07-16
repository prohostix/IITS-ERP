import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
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
    try {
      const payload: any = {
        name: formData.name,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        capacity: formData.capacity ? parseInt(String(formData.capacity)) : 0,
        status: formData.status
      };

      if (formData.universityId) payload.universityId = formData.universityId;
      if (formData.programId) payload.programId = formData.programId;

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
    } catch (err) {
      toast.error('Failed to delete session');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admission Sessions</h2>
          <p className="text-muted-foreground">Manage intakes and admission cycles per program and university</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="premium-gradient text-white"><Plus className="w-4 h-4 mr-2" />Add Session</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Admission Session' : 'Create Admission Session'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <Label>Session Name / Batch</Label>
                <Input 
                  placeholder="e.g. Autumn 2026 Batch A" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>University</Label>
                  <Select 
                    value={formData.universityId || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, universityId: v === 'none' ? '' : v, programId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Universities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Universities</SelectItem>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Program</Label>
                  <Select 
                    value={formData.programId || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, programId: v === 'none' ? '' : v })}
                    disabled={!formData.universityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.universityId ? "Select Program" : "Select University First"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Programs</SelectItem>
                      {filteredPrograms.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <Label>End Date</Label>
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
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
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

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Intakes & Admission Cycles</CardTitle>
          <CardDescription>Academic configurations for running programs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sessions created yet</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((s) => {
                const programName = programs.find(p => p.id === s.programId)?.name || 'All Programs';
                const uniName = universities.find(u => u.id === s.universityId)?.name || 'All Universities';
                
                return (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:bg-muted/40 transition-all gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">{s.name}</span>
                          <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                          <p>
                            <span className="font-medium text-foreground">University:</span> {uniName}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Program:</span> {programName}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Duration:</span> {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                          </p>
                          {s.capacity ? (
                            <p>
                              <span className="font-medium text-foreground">Capacity:</span> {s.capacity} seats
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
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
