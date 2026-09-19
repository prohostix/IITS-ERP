import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function QuickAddProgramModal({ universityId }: { universityId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    courseType: 'Online Degree',
    duration: 12,
    status: 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/operations/programs', { ...formData, universityId });
      toast.success('Program added successfully');
      setOpen(false);
      setFormData({ name: '', code: '', courseType: 'Online Degree', duration: 12, status: 'active' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add program');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80"><BookOpen className="w-3.5 h-3.5 mr-1" /> Program</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Program to University</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Program Name</Label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Program Code</Label><Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
          <div>
            <Label>Course Type</Label>
            <Select value={formData.courseType} onValueChange={v => setFormData({ ...formData, courseType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Skill Course">Skill Course</SelectItem>
                <SelectItem value="Online Degree">Online Degree</SelectItem>
                <SelectItem value="B.Voc Degree">B.Voc Degree</SelectItem>
                <SelectItem value="Credit Transfer">Credit Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (Months)</Label>
            <Input type="number" required value={formData.duration} onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Program'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
