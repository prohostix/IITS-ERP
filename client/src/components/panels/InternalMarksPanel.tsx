import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function InternalMarksPanel() {
  const { user } = useAuth();
  const isCenterAdmin = user?.role === 'center_admin';
  const isReadOnly = !isCenterAdmin; // ops_admin and others are read-only

  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectName: '',
    marks: '',
    maxMarks: '100',
    examType: 'internal'
  });

  useEffect(() => {
    fetchMarks();
    fetchStudents();
  }, []);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/marks');
      setMarks(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch marks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch {
      // non-critical
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = formData.studentId;
    const payload = {
      studentId,
      subjectId: studentId,
      subjectName: formData.subjectName,
      marks: Number(formData.marks),
      maxMarks: Number(formData.maxMarks),
      examType: formData.examType
    };
    try {
      if (editingId) {
        await api.put(`/operations/marks/${editingId}`, payload);
        toast.success('Marks updated');
      } else {
        await api.post('/operations/marks', payload);
        toast.success('Marks added');
      }
      setDialogOpen(false);
      resetForm();
      fetchMarks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    }
  };

  const handleEdit = (m: any) => {
    const studentId = typeof m.studentId === 'object'
      ? (m.studentId?.id || m.studentId?.id)
      : m.studentId;
    setEditingId(m.id || m.id);
    setFormData({
      studentId: studentId?.toString() || '',
      subjectName: m.subjectName || '',
      marks: m.marks?.toString() || '',
      maxMarks: m.maxMarks?.toString() || '100',
      examType: m.examType || 'internal'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this marks record?')) return;
    try {
      await api.delete(`/operations/marks/${id}`);
      toast.success('Marks deleted');
      fetchMarks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ studentId: '', subjectName: '', marks: '', maxMarks: '100', examType: 'internal' });
  };

  const getGradeBadge = (marks: number, maxMarks: number) => {
    const pct = (marks / maxMarks) * 100;
    if (pct >= 90) return <Badge className="bg-success/10 text-success text-[10px]">A+</Badge>;
    if (pct >= 75) return <Badge className="bg-primary/10 text-primary text-[10px]">A</Badge>;
    if (pct >= 60) return <Badge className="bg-info/10 text-info text-[10px]">B</Badge>;
    if (pct >= 45) return <Badge className="bg-warning/10 text-warning text-[10px]">C</Badge>;
    return <Badge className="bg-error/10 text-error text-[10px]">F</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Internal Marks</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isReadOnly
              ? 'View student assessment marks entered by study centers'
              : 'Enter and manage student internal assessment marks'}
          </p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Marks</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Marks' : 'Add Marks'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <Select value={formData.studentId} onValueChange={(v) => setFormData({ ...formData, studentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.filter(s => s && (s.id || s.id)).map((s) => (
                        <SelectItem key={s.id || s.id} value={(s.id || s.id).toString()}>
                          {s.name}{s.enrollmentNo ? ` (${s.enrollmentNo})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject Name</Label>
                  <Input value={formData.subjectName} onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marks Obtained</Label>
                    <Input type="number" min="0" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Maximum Marks</Label>
                    <Input type="number" min="1" value={formData.maxMarks} onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>Exam Type</Label>
                  <Select value={formData.examType} onValueChange={(v) => setFormData({ ...formData, examType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="practical">Practical</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
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
        {isReadOnly && (
          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
            <Eye className="w-3.5 h-3.5" />
            Read Only
          </Badge>
        )}
      </div>

      {/* Summary stats */}
      {marks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Records', value: marks.length },
            { label: 'Students', value: new Set(marks.map(m => typeof m.studentId === 'object' ? m.studentId?.id : m.studentId)).size },
            { label: 'Avg Score', value: `${Math.round(marks.reduce((s, m) => s + (m.maxMarks ? (m.marks / m.maxMarks) * 100 : 0), 0) / marks.length)}%` },
            { label: 'Subjects', value: new Set(marks.map(m => m.subjectName)).size },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Marks Records</CardTitle>
          <CardDescription>
            {isReadOnly ? 'Submitted by study centers' : 'Your entered marks'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : marks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No marks records found</p>
              {!isReadOnly && <p className="text-xs mt-1">Click "Add Marks" to enter student marks</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {marks.filter(m => m && (m.id || m.id)).map((m) => {
                const mid = m.id || m.id;
                const studentName = typeof m.studentId === 'object' ? m.studentId?.name : 'Unknown Student';
                const enrollNo = typeof m.studentId === 'object' ? m.studentId?.enrollmentNo : null;
                const centerName = typeof m.studyCenterId === 'object' ? m.studyCenterId?.name : null;
                const pct = m.maxMarks ? ((m.marks / m.maxMarks) * 100).toFixed(1) : 0;
                return (
                  <div key={mid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {studentName}
                          {enrollNo && <span className="text-muted-foreground text-xs ml-2">({enrollNo})</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {m.subjectName || 'N/A'} • <span className="capitalize">{m.examType}</span> • {m.marks}/{m.maxMarks} ({pct}%)
                          {centerName && <span className="ml-2 text-primary/70">• {centerName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getGradeBadge(m.marks, m.maxMarks)}
                      {!isReadOnly && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(m)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(mid)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
