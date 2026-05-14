import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function LicensesPanel() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'basic',
    maxUsers: '10',
    maxStorage: '1024',
    durationMonths: '12',
    price: '',
    status: 'active',
    features: '',
  });

  useEffect(() => { fetchLicenses(); }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/licenses');
      setLicenses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      type: formData.type,
      maxUsers: Number(formData.maxUsers),
      maxStorage: Number(formData.maxStorage),
      durationMonths: Number(formData.durationMonths),
      price: Number(formData.price),
      status: formData.status,
      features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
    };
    try {
      if (editingId) {
        await api.put(`/licenses/${editingId}`, payload);
      } else {
        await api.post('/licenses', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchLicenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save license');
    }
  };

  const handleEdit = (l: any) => {
    setEditingId(l.id || l.id);
    setFormData({
      name: l.name || '',
      type: l.type || 'basic',
      maxUsers: l.maxUsers?.toString() || '10',
      maxStorage: l.maxStorage?.toString() || '1024',
      durationMonths: l.durationMonths?.toString() || '12',
      price: l.price?.toString() || '',
      status: l.status || 'active',
      features: Array.isArray(l.features) ? l.features.join(', ') : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this license?')) return;
    try {
      await api.delete(`/licenses/${id}`);
      fetchLicenses();
    } catch (err) {
      console.error('Failed to delete license:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'basic', maxUsers: '10', maxStorage: '1024', durationMonths: '12', price: '', status: 'active', features: '' });
  };

  const typeColor: Record<string, string> = {
    basic: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">License Management</h2>
          <p className="text-muted-foreground">Manage software licenses and subscription plans</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add License</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit License' : 'Add New License'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>License Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Basic Plan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Users</Label>
                  <Input type="number" min="1" value={formData.maxUsers} onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })} required />
                </div>
                <div>
                  <Label>Max Storage (MB)</Label>
                  <Input type="number" min="1" value={formData.maxStorage} onChange={(e) => setFormData({ ...formData, maxStorage: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (months)</Label>
                  <Input type="number" min="1" value={formData.durationMonths} onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })} required />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Features (comma-separated)</Label>
                <Input value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} placeholder="e.g., Analytics, API Access, SSO" />
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
        <CardHeader><CardTitle>Licenses</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No licenses found</div>
          ) : (
            <div className="space-y-3">
              {licenses.filter(l => l && (l.id || l.id)).map((l) => {
                const lid = l.id || l.id;
                return (
                  <div key={lid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{l.name}</span>
                          <Badge className={typeColor[l.type] || 'bg-gray-100 text-gray-800'}>{l.type}</Badge>
                          <Badge variant={l.status === 'active' ? 'default' : 'outline'}>{l.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {l.maxUsers} users • {l.maxStorage} MB • {l.durationMonths} months • ${l.price}
                        </div>
                        {l.features?.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">{l.features.join(', ')}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(l)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(lid)}><Trash2 className="w-4 h-4" /></Button>
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
