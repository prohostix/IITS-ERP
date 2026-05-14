import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

export function ComplaintsPanel() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'open'
  });

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/complaints');
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/complaints/${editingId}`, formData);
      } else {
        await api.post('/hr/complaints', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save complaint');
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id || c.id);
    setFormData({
      subject: c.subject || '',
      description: c.description || '',
      category: c.category || 'general',
      priority: c.priority || 'medium',
      status: c.status || 'open'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this complaint?')) return;
    try {
      await api.delete(`/hr/complaints/${id}`);
      fetchComplaints();
    } catch (err) {
      console.error('Failed to delete complaint:', err);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm('Mark as resolved?')) return;
    try {
      await api.put(`/hr/complaints/${id}/resolve`);
      fetchComplaints();
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ subject: '', description: '', category: 'general', priority: 'medium', status: 'open' });
  };

  const statusColors: any = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };
  const priorityColors: any = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Complaints Management</h2>
          <p className="text-muted-foreground">Track and resolve employee complaints</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />File Complaint</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Complaint' : 'File New Complaint'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required placeholder="Brief description of the issue" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="discrimination">Discrimination</SelectItem>
                      <SelectItem value="workplace">Workplace</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
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

      <Card>
        <CardHeader><CardTitle>Active Complaints</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No complaints found</div>
          ) : (
            <div className="space-y-4">
              {complaints.filter(c => c && (c.id || c.id)).map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{c.subject}</h3>
                          <Badge className={statusColors[c.status] || ''}>{c.status?.replace('_', ' ')}</Badge>
                          <Badge className={priorityColors[c.priority] || ''}>{c.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Category: {c.category} • {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : ''}
                          {c.employeeId?.name && ` • By: ${c.employeeId.name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {c.status !== 'resolved' && c.status !== 'closed' && (
                          <Button variant="ghost" size="sm" onClick={() => handleResolve(cid)}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cid)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
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
