import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programId: { name: string; code: string } | string;
  status: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  payment_pending: 'bg-muted text-muted-foreground',
  document_review: 'bg-info/10 text-info',
  dept_review: 'bg-warning/10 text-warning',
  finance_review: 'bg-orange-100 text-orange-700',
  enrolled: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function StudyCenterEnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/enrollment/enrollments${params}`);
      setEnrollments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const getProgramName = (e: Enrollment) =>
    typeof e.programId === 'object' ? `${e.programId.name} (${e.programId.code})` : e.programId;

  const STATUSES = ['', 'document_review', 'dept_review', 'finance_review', 'enrolled', 'rejected'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1">Track all student enrollments submitted by your center.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'
            )}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No enrollments found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => (
            <Card key={e.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[e.status] || 'bg-muted text-muted-foreground')}>
                        {e.status.replace(/_/g, ' ')}
                      </Badge>
                      {e.enrollmentNumber && <span className="text-xs text-muted-foreground">{e.enrollmentNumber}</span>}
                    </div>
                    <h4 className="font-semibold">{e.studentName}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{e.studentEmail}</span>
                      <span>{e.studentPhone}</span>
                      <span>{getProgramName(e)}</span>
                      <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
