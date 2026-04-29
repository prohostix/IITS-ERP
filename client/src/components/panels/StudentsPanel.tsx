import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function StudentsPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'center_admin'].includes(user?.role || '');
  const canDelete = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    enrollmentNo: '',
    programId: '',
    centerId: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchCenters();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/operations/programs');
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await api.get('/operations/centers');
      setCenters(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch centers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error('Failed to save student:', error);
      alert(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleEdit = (student: any) => {
    const studentId = student.id || student.id;
    const programId = typeof student.programId === 'object'
      ? (student.programId?.id || student.programId?.id)
      : student.programId;
    const centerId = typeof student.centerId === 'object'
      ? (student.centerId?.id || student.centerId?.id)
      : student.centerId;
    setEditingId(studentId);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      enrollmentNo: student.enrollmentNo || '',
      programId: programId?.toString() || '',
      centerId: centerId?.toString() || '',
      status: student.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (error) {
      console.error('Failed to delete student:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      enrollmentNo: '',
      programId: '',
      centerId: '',
      status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-muted-foreground">Manage student records and enrollments</p>
        </div>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Student</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
              </div>
              <div>
                <Label>Enrollment Number</Label>
                <Input value={formData.enrollmentNo} onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Program</Label>
                  <Select value={formData.programId} onValueChange={(value) => setFormData({...formData, programId: value})}>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {programs.filter(p => p && (p.id || p.id)).map((prog) => (
                        <SelectItem key={prog.id || prog.id} value={(prog.id || prog.id).toString()}>
                          {prog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Study Center</Label>
                  <Select value={formData.centerId} onValueChange={(value) => setFormData({...formData, centerId: value})}>
                    <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                    <SelectContent>
                      {centers.filter(c => c && (c.id || c.id)).map((center) => (
                        <SelectItem key={center.id || center.id} value={(center.id || center.id).toString()}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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

      <Card>
        <CardHeader><CardTitle>Student Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No students found</div>
          ) : (
            <div className="space-y-2">
              {students.filter(s => s && (s.id || s.id)).map((student) => {
                const studentId = student.id || student.id;
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : '';
                const programName = typeof student.programId === 'object' ? student.programId?.name : '';
                return (
                  <div key={studentId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.enrollmentNo}{programName ? ` • ${programName}` : ''}{centerName ? ` • ${centerName}` : ''}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {student.email}</span>
                          {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {student.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{student.status}</Badge>
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}><Edit className="w-4 h-4" /></Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(studentId)}><Trash2 className="w-4 h-4" /></Button>
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
