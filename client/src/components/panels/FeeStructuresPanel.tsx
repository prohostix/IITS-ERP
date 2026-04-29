import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export function FeeStructuresPanel() {
  const [fees, setFees] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    programId: '',
    registrationFee: '0',
    tuitionFee: '0',
    examFee: '0',
    gstPercentage: '18'
  });

  useEffect(() => {
    fetchFees();
    fetchPrograms();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/fees');
      setFees(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      programId: formData.programId,
      registrationFee: Number(formData.registrationFee),
      tuitionFee: Number(formData.tuitionFee),
      examFee: Number(formData.examFee),
      gstPercentage: Number(formData.gstPercentage)
    };
    try {
      if (editingId) {
        await api.put(`/finance/fees/${editingId}`, payload);
      } else {
        await api.post('/finance/fees', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchFees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save fee structure');
    }
  };

  const handleEdit = (f: any) => {
    const progId = typeof f.programId === 'object' ? (f.programId?.id || f.programId?.id) : f.programId;
    setEditingId(f.id || f.id);
    setFormData({
      programId: progId?.toString() || '',
      registrationFee: f.registrationFee?.toString() || '0',
      tuitionFee: f.tuitionFee?.toString() || '0',
      examFee: f.examFee?.toString() || '0',
      gstPercentage: f.gstPercentage?.toString() || '18'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await api.delete(`/finance/fees/${id}`);
      fetchFees();
    } catch (err) {
      console.error('Failed to delete fee structure:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ programId: '', registrationFee: '0', tuitionFee: '0', examFee: '0', gstPercentage: '18' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Structure Management</h2>
          <p className="text-muted-foreground">Manage program fees and billing structures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Fee Structure</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Fee Structure' : 'Add New Fee Structure'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Program</Label>
                <Select value={formData.programId} onValueChange={(v) => setFormData({ ...formData, programId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {programs.filter(p => p && (p.id || p.id)).map((p) => (
                      <SelectItem key={p.id || p.id} value={(p.id || p.id).toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registration Fee</Label>
                  <Input type="number" min="0" value={formData.registrationFee} onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })} required />
                </div>
                <div>
                  <Label>Tuition Fee</Label>
                  <Input type="number" min="0" value={formData.tuitionFee} onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Exam Fee</Label>
                  <Input type="number" min="0" value={formData.examFee} onChange={(e) => setFormData({ ...formData, examFee: e.target.value })} required />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Input type="number" min="0" max="100" value={formData.gstPercentage} onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })} required />
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
        <CardHeader><CardTitle>Fee Structures</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No fee structures found</div>
          ) : (
            <div className="space-y-2">
              {fees.filter(f => f && (f.id || f.id)).map((f) => {
                const fid = f.id || f.id;
                const progName = typeof f.programId === 'object' ? f.programId?.name : '';
                const total = (f.registrationFee || 0) + (f.tuitionFee || 0) + (f.examFee || 0);
                return (
                  <div key={fid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{progName || 'Unknown Program'}</div>
                        <div className="text-sm text-muted-foreground">
                          Reg: ${f.registrationFee} • Tuition: ${f.tuitionFee} • Exam: ${f.examFee} • GST: {f.gstPercentage}%
                        </div>
                        <div className="text-xs text-muted-foreground">Total (before GST): ${total}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(fid)}><Trash2 className="w-4 h-4" /></Button>
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
