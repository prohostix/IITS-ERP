import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Megaphone, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

import { useAuth } from '@/hooks/useAuth';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  hr: 'bg-purple-100 text-purple-800',
  ops: 'bg-orange-100 text-orange-800',
  finance: 'bg-emerald-100 text-emerald-800',
  sales: 'bg-cyan-100 text-cyan-800',
};

export function AnnouncementsPanel() {
  const { user } = useAuth();
  const canManage = ['hr_admin', 'org_admin', 'superadmin'].includes(user?.role || '');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', content: '', type: 'general', priority: 'medium', expiresAt: '',
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/announcements');
      setAnnouncements(res.data.data || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, expiresAt: form.expiresAt || undefined };
      if (editingId) {
        await api.put(`/hr/announcements/${editingId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/hr/announcements', payload);
        toast.success('Announcement published');
      }
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id || a.id);
    setForm({
      title: a.title || '',
      content: a.content || '',
      type: a.type || 'general',
      priority: a.priority || 'medium',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/hr/announcements/${id}`);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', content: '', type: 'general', priority: 'medium', expiresAt: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground text-sm">Publish org-wide announcements visible to all employees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnnouncements}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New Announcement
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Published Announcements</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => {
                const aid = a.id || a.id;
                return (
                  <div key={aid} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={`text-xs ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge>
                        <Badge className={`text-xs ${PRIORITY_COLORS[a.priority] || ''}`}>{a.priority}</Badge>
                        {a.postedBy?.name && <span className="text-xs text-muted-foreground">by {a.postedBy.name}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(a.postedAt || a.createdAt).toLocaleDateString()}</span>
                        {a.expiresAt && <span className="text-xs text-orange-600">Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(aid)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <Textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="ops">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Expires On (optional)</Label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">{editingId ? 'Update' : 'Publish'}</Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
