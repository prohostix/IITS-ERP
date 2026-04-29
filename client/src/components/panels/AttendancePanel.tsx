import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export function AttendancePanel() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr_admin';
  const canViewAll = ['hr_admin', 'org_admin', 'ceo'].includes(user?.role || '');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '09:00',
    checkOut: '18:00',
    notes: ''
  });

  useEffect(() => {
    fetchAttendance();
    if (canViewAll) fetchEmployees();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // HR sees all; employees see only their own
      const endpoint = canViewAll ? '/hr/attendance' : '/hr/attendance/my';
      const response = await api.get(endpoint);
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date + time strings into full ISO datetime for the Date fields
      const toISO = (date: string, time: string) => {
        if (!date || !time) return undefined;
        return new Date(`${date}T${time}:00`).toISOString();
      };
      const payload: any = {
        employeeId: formData.employeeId,
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        notes: formData.notes,
      };
      if (formData.checkIn) payload.checkIn = toISO(formData.date, formData.checkIn);
      if (formData.checkOut) payload.checkOut = toISO(formData.date, formData.checkOut);

      if (editingId) {
        await api.put(`/hr/attendance/${editingId}`, payload);
      } else {
        await api.post('/hr/attendance', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchAttendance();
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      alert(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleEdit = (record: any) => {
    const recId = record.id || record.id;
    const empId = record.employeeId?.id || record.employeeId?.id || record.employeeId || '';
    setEditingId(recId);
    setFormData({
      employeeId: empId?.toString() || '',
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : '',
      status: record.status || 'present',
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '09:00',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '18:00',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/hr/attendance/${id}`);
      fetchAttendance();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      half_day: 'bg-blue-100 text-blue-800',
      leave: 'bg-purple-100 text-purple-800'
    };
    return <Badge className={variants[status] || ''}>{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance {canViewAll ? 'Management' : 'Records'}</h2>
          <p className="text-muted-foreground">{canViewAll ? 'Track and manage employee attendance' : 'Your attendance history'}</p>
        </div>
        {isHR && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Mark Attendance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData({...formData, employeeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(emp => emp && (emp.id || emp.id)).map((emp) => (
                      <SelectItem key={emp.id || emp.id} value={(emp.id || emp.id).toString()}>
                        {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check In</Label>
                  <Input type="time" value={formData.checkIn} onChange={(e) => setFormData({...formData, checkIn: e.target.value})} />
                </div>
                <div>
                  <Label>Check Out</Label>
                  <Input type="time" value={formData.checkOut} onChange={(e) => setFormData({...formData, checkOut: e.target.value})} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" />
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
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
          ) : (
            <div className="space-y-2">
              {attendance.filter(rec => rec && (rec.id || rec.id)).map((record) => {
                const recId = record.id || record.id;
                return (
                <div key={recId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">
                      {record.employeeId?.name || record.employee?.name || record.user?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(record.date).toLocaleDateString()} • {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'} - {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                    </div>
                    {record.notes && <div className="text-xs text-muted-foreground mt-1">{record.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(record.status)}
                    {isHR && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(recId)}>
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
