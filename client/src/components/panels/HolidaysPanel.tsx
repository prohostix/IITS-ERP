import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function HolidaysPanel() {
  const { user } = useAuth();
  const canManage = ['hr_admin', 'org_admin', 'superadmin'].includes(user?.role || '');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'national', description: '' });

  useEffect(() => { fetchHolidays(); }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/holidays');
      setHolidays(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/holidays/${editingId}`, formData);
      } else {
        await api.post('/hr/holidays', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleEdit = (h: any) => {
    setEditingId(h.id || h.id);
    setFormData({
      name: h.name || '',
      date: h.date ? new Date(h.date).toISOString().split('T')[0] : '',
      type: h.type || 'national',
      description: h.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await api.delete(`/hr/holidays/${id}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', date: '', type: 'national', description: '' });
  };

  const typeColors: any = {
    national: 'bg-blue-100 text-blue-800',
    regional: 'bg-purple-100 text-purple-800',
    company: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Holiday Calendar</h2>
          <p className="text-muted-foreground">Company holidays and observances</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Holiday</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Holiday Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Holiday List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No holidays found</div>
          ) : (
            <div className="space-y-2">
              {holidays.filter(h => h && (h.id || h.id)).map((h) => {
                const hid = h.id || h.id;
                const d = new Date(h.date);
                const isUpcoming = d >= new Date();
                return (
                  <div key={hid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg ${isUpcoming ? 'bg-primary/10' : 'bg-muted'}`}>
                        <div className="text-xl font-bold">{d.getDate()}</div>
                        <div className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </div>
                      <div>
                        <div className={`font-medium ${!isUpcoming ? 'text-muted-foreground' : ''}`}>{h.name}</div>
                        <div className="text-sm text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={typeColors[h.type] || ''}>{h.type}</Badge>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(h)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(hid)}><Trash2 className="w-4 h-4" /></Button>
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
    </div>
  );
}
