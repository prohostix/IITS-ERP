import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function StudyCentersPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'sales_admin', 'bde', 'employee'].includes(user?.role || '');
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contact: '',
    email: '',
    status: 'pending',
    referredById: ''
  });
  const [creds, setCreds] = useState<{ userId: string; password: string } | null>(null);
  const [showCreds, setShowCreds] = useState(false);

  useEffect(() => {
    fetchCenters();
    api.get('/sales/team-members')
      .then(res => setTeam(res.data.data || []))
      .catch(() => setTeam([]));
  }, []);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch centers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        referredById: formData.referredById === '__none__' || !formData.referredById ? null : formData.referredById
      };
      if (editingId) {
        await api.put(`/operations/centers/${editingId}`, payload);
        toast.success('Center updated');
      } else {
        const res = await api.post('/operations/centers', payload);
        if (res.data.data.credentials) {
          setCreds(res.data.data.credentials);
          setShowCreds(true);
        }
        toast.success('Center created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchCenters();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save center');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      code: c.code || '',
      address: c.address || '',
      contact: c.contact || '',
      email: c.email || '',
      status: c.status || 'pending',
      referredById: c.referredBy || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study center?')) return;
    try {
      await api.delete(`/operations/centers/${id}`);
      fetchCenters();
    } catch (err) {
      console.error('Failed to delete center:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', address: '', contact: '', email: '', status: 'pending', referredById: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Study Center Management</h2>
          <p className="text-muted-foreground">Manage study centers and locations</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Study Center</Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Study Center' : 'Add New Study Center'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Center Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Center Code</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact (Phone)</Label>
                  <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
              </div>
               {team.length > 0 && (
                <div>
                  <Label>Assigned Sales Agent</Label>
                  <Select value={formData.referredById} onValueChange={(v) => setFormData({ ...formData, referredById: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a sales representative..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {team.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.role?.replace(/_/g, ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
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
        )}
      </div>

      {/* Credentials Dialog */}
      <Dialog open={showCreds} onOpenChange={setShowCreds}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Center Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              New center admin credentials have been generated. Please copy and share them with the center administrator.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>{creds?.userId}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(creds?.userId || '', 'User ID')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>{creds?.password}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(creds?.password || '', 'Password')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Note: This password will not be shown again. Ensure you have copied it correctly.
            </p>
          </div>
          <Button onClick={() => setShowCreds(false)} className="w-full">Done</Button>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>Study Centers</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : centers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No study centers found</div>
          ) : (
            <div className="space-y-2">
              {centers.filter(c => c && (c.id || c.id)).map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-muted-foreground">Code: {c.code} • {c.email}</div>
                        {c.referrer && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Assigned Sales Agent: <span className="font-semibold text-foreground">{c.referrer.name}</span> ({c.referrer.role?.replace(/_/g, ' ')})
                          </div>
                        )}
                        {c.address && <div className="text-xs text-muted-foreground mt-0.5">{c.address}</div>}
                        {c.credentials && (user?.role === 'org_admin' || user?.role === 'superadmin' || user?.role === 'ceo') && (
                          <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded border border-border inline-block">
                            <span className="font-semibold text-foreground">Credentials:</span> User ID: <span className="font-mono font-bold text-foreground">{c.credentials.userId}</span> | Password: <span className="font-mono font-bold text-foreground">{c.credentials.password}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{c.status}</Badge>
                      {canWrite && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(cid)}><Trash2 className="w-4 h-4" /></Button>
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
