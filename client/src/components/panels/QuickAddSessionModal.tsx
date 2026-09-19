import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function QuickAddSessionModal({ universityId }: { universityId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    programId: '',
    startDate: '',
    endDate: '',
    capacity: 0,
    status: 'active'
  });

  useEffect(() => {
    if (open) {
      api.get('/operations/programs').then(res => {
        setPrograms(res.data.data?.filter((p: any) => p.universityId === universityId) || []);
      });
    }
  }, [open, universityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { 
        name: formData.name,
        status: formData.status,
        universityId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        capacity: Number(formData.capacity)
      };

      if (formData.programId && formData.programId !== '__none__') {
        payload.programId = formData.programId;
      }

      await api.post('/operations/sessions', payload);
      toast.success('Session added successfully');
      setOpen(false);
      setFormData({ name: '', programId: '', startDate: '', endDate: '', capacity: 0, status: 'active' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"><Calendar className="w-3.5 h-3.5 mr-1" /> Session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Session to University</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Session Name (e.g. Fall 2026)</Label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
          <div>
            <Label>Program (Optional)</Label>
            <Select value={formData.programId} onValueChange={v => setFormData({ ...formData, programId: v })}>
              <SelectTrigger><SelectValue placeholder="All Programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
          </div>
          <div><Label>Capacity</Label><Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} /></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Session'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
