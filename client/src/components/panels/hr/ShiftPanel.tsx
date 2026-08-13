import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isOpenShift: boolean;
  graceTimeMinutes: number;
}

export function ShiftPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Shift>>({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    isOpenShift: false,
    graceTimeMinutes: 15
  });
  
  useEffect(() => {
    fetchShifts();
  }, []);
  
  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/shifts');
      setShifts(res.data.data || []);
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/hr/shifts/${form.id}`, form);
        toast.success('Shift updated');
      } else {
        await api.post('/hr/shifts', form);
        toast.success('Shift created');
      }
      setDialogOpen(false);
      fetchShifts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save shift');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      await api.delete(`/hr/shifts/${id}`);
      toast.success('Shift deleted');
      fetchShifts();
    } catch {
      toast.error('Failed to delete shift');
    }
  };
  
  const openEdit = (shift: Shift) => {
    setForm(shift);
    setDialogOpen(true);
  };
  
  const openCreate = () => {
    setForm({
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      isOpenShift: false,
      graceTimeMinutes: 15
    });
    setDialogOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shift & Attendance Settings</h2>
          <p className="text-muted-foreground mt-1">Configure employee shifts, timings, and grace periods.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Shift</Button>
      </div>
      
      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading shifts...</div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">No shifts found. Create one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map(shift => (
            <Card key={shift.id} className="shadow-sm">
              <CardContent className="p-6 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => openEdit(shift)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(shift.id)} className="p-1 hover:bg-muted rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {shift.isOpenShift ? <CheckCircle className="w-5 h-5 text-success" /> : <Clock className="w-5 h-5 text-primary" />}
                  {shift.name}
                </h3>
                
                <div className="mt-4 space-y-2 text-sm">
                  {shift.isOpenShift ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">Open Shift</Badge>
                  ) : (
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Timing:</span>
                      <span className="font-medium">{shift.startTime} - {shift.endTime}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Grace Period:</span>
                    <span className="font-medium">{shift.graceTimeMinutes} mins</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div>
              <Label>Shift Name</Label>
              <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Morning Shift" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isOpenShift" checked={form.isOpenShift} onChange={e => setForm({...form, isOpenShift: e.target.checked})} />
              <Label htmlFor="isOpenShift">Open Shift (Flexible timings)</Label>
            </div>
            {!form.isOpenShift && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" required value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" required value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                </div>
              </div>
            )}
            <div>
              <Label>Grace Time (Minutes)</Label>
              <Input type="number" required min="0" value={form.graceTimeMinutes} onChange={e => setForm({...form, graceTimeMinutes: Number(e.target.value)})} />
              <p className="text-xs text-muted-foreground mt-1">Minutes allowed before late deduction applies</p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
