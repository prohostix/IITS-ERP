import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ManagerHiringPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', departmentId: '', count: 1, description: '' });
  const [departments, setDepartments] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await api.get('/hiring/manager-requests');
      setRequests(res.data.data || []);
      const deptRes = await api.get('/org/departments');
      setDepartments(deptRes.data.data || []);
    } catch (e: any) {
      toast.error('Failed to fetch hiring requests');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hiring/request', formData);
      toast.success('Hiring request created');
      setIsOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error('Failed to create request');
    }
  };

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'department', header: 'Department', render: (r: any) => r.department?.name || 'N/A' },
    { key: 'count', header: 'Count' },
    { key: 'status', header: 'Status', render: (r: any) => <Badge>{r.status.replace(/_/g, ' ')}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Hiring Requests</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>Raise Hiring Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raise Hiring Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Count</Label>
                  <Input type="number" required min="1" value={formData.count} onChange={e => setFormData({ ...formData, count: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <Button type="submit">Submit Request</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={requests} />
        </CardContent>
      </Card>
    </div>
  );
}
