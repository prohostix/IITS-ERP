import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import api from '@/lib/api';
import { toast } from 'sonner';

export function StudyCenterDraftsPanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/enrollment/drafts');
      
      const formattedDrafts = res.data.data.map((d: any) => ({
        id: d.id,
        createdAt: new Date(d.createdAt).toLocaleDateString(),
        studentName: d.data?.studentName || 'Not specified',
        programName: d.data?.programName || 'Not specified',
        _rawData: d.data
      }));
      setDrafts(formattedDrafts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      await api.delete(`/enrollment/drafts/${id}`);
      toast.success('Draft deleted');
      fetchDrafts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete draft');
    }
  };

  const resumeDraft = (id: string, row: any) => {
    // Put draft data in sessionStorage so EnrollStudentPanel can pick it up
    sessionStorage.setItem('enrollment_draft_resume', JSON.stringify({ id, ...row._rawData }));
    if (onNavigate) {
      onNavigate('enroll');
    }
  };

  const columns = [
    { key: 'createdAt', label: 'Started On', type: 'date' as const },
    { key: 'studentName', label: 'Student Name', type: 'text' as const },
    { key: 'programName', label: 'Program', type: 'text' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Saved Drafts</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={drafts}
            loading={loading}
            onEdit={resumeDraft}
            onDelete={deleteDraft}
          />
        </CardContent>
      </Card>
    </div>
  );
}
