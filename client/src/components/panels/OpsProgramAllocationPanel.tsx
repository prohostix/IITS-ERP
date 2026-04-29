import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Center { id: string; name: string; code: string; }
interface Program { id: string; name: string; code: string; courseType?: string; }
interface Allocation { id: string; programId: Program; allocatedAt: string; }

export function OpsProgramAllocationPanel() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/operations/centers?status=active').then(r => setCenters(r.data.data || [])).catch(() => {});
    api.get('/operations/programs').then(r => setPrograms(r.data.data || [])).catch(() => {});
  }, []);

  const fetchAllocations = async (centerId: string) => {
    if (!centerId) return;
    setLoading(true);
    try {
      const res = await api.get(`/operations/centers/${centerId}/allocations`);
      setAllocations(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const handleCenterChange = (id: string) => {
    setSelectedCenter(id);
    fetchAllocations(id);
  };

  const handleAllocate = async () => {
    if (!selectedProgram) { toast.error('Select a program'); return; }
    setSubmitting(true);
    try {
      await api.post(`/operations/centers/${selectedCenter}/allocations`, { programId: selectedProgram });
      toast.success('Program allocated');
      setOpen(false);
      setSelectedProgram('');
      fetchAllocations(selectedCenter);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to allocate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (allocId: string) => {
    try {
      await api.delete(`/operations/centers/${selectedCenter}/allocations/${allocId}`);
      toast.success('Allocation removed');
      fetchAllocations(selectedCenter);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to remove');
    }
  };

  const allocatedProgramIds = allocations.map(a => a.programId.id);
  const availablePrograms = programs.filter(p => !allocatedProgramIds.includes(p.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Program Allocations</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage which programs each active study center can enroll students into.</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedCenter} onValueChange={handleCenterChange}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a study center" />
          </SelectTrigger>
          <SelectContent>
            {centers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCenter && (
          <>
            <Button variant="outline" size="sm" onClick={() => fetchAllocations(selectedCenter)} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} disabled={availablePrograms.length === 0}>
              <Plus className="w-4 h-4 mr-2" />Add Program
            </Button>
          </>
        )}
      </div>

      {selectedCenter && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : allocations.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            No programs allocated yet.
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Allocated Programs ({allocations.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {allocations.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <span className="font-medium text-sm">{a.programId.name}</span>
                    <span className="text-muted-foreground text-xs ml-2">({a.programId.code})</span>
                    {a.programId.courseType && (
                      <Badge variant="outline" className="ml-2 text-[10px]">{a.programId.courseType}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => handleRemove(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Program</DialogTitle></DialogHeader>
          <div className="py-2">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {availablePrograms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSelectedProgram(''); }}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={submitting || !selectedProgram}>
              {submitting ? 'Allocating...' : 'Allocate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
