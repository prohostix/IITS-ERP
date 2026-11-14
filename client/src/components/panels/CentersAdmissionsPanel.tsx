import { useState, useEffect } from 'react';
import { RefreshCw, Search, School, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  branchId?: string | null;
  branchName?: string | null;
  program: { 
    name: string; 
    code: string;
    university: { name: string; code: string; }
  };
  studyCenter: {
    name: string;
    code: string;
    branchName?: string | null;
  };
  status: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  payment_pending: 'bg-muted text-muted-foreground',
  document_review: 'bg-info/10 text-info',
  pending_doc_review: 'bg-info/10 text-info',
  dept_review: 'bg-warning/10 text-warning',
  finance_review: 'bg-orange-100 text-orange-700',
  pending_finance_review: 'bg-orange-100 text-orange-700',
  enrolled: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function CentersAdmissionsPanel() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'branch_asc' | 'branch_desc'>('latest');

  const fetch = async () => {
    setLoading(true);
    try {
      const [res, branchRes] = await Promise.all([
        api.get('/enrollment/all'),
        api.get('/org/branches').catch(() => ({ data: { data: [] } }))
      ]);
      setEnrollments(res.data.data || []);
      setBranches(branchRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load admissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = enrollments.filter(e => {
    const eBranchName = e.branchName || e.studyCenter?.branchName || '';
    const matchesSearch = 
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.enrollmentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      e.studyCenter.name.toLowerCase().includes(search.toLowerCase()) ||
      e.program.name.toLowerCase().includes(search.toLowerCase()) ||
      eBranchName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || e.branchId === branchFilter || eBranchName === branchFilter;
    
    return matchesSearch && matchesStatus && matchesBranch;
  }).sort((a, b) => {
    if (sortBy === 'branch_asc') {
      const ba = a.branchName || a.studyCenter?.branchName || 'ZZZ';
      const bb = b.branchName || b.studyCenter?.branchName || 'ZZZ';
      return ba.localeCompare(bb);
    }
    if (sortBy === 'branch_desc') {
      const ba = a.branchName || a.studyCenter?.branchName || '';
      const bb = b.branchName || b.studyCenter?.branchName || '';
      return bb.localeCompare(ba);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const STATUSES = ['', 'pending_doc_review', 'document_review', 'payment_pending', 'dept_review', 'pending_finance_review', 'finance_review', 'enrolled', 'rejected'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centers Admissions</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {['sales_admin', 'bde'].includes(user?.role || '') 
              ? 'View admissions for study centers referred by you.'
              : 'Global view of all student enrollments across all study centers.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search student, center, branch, program or enrollment ID..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {user?.role !== 'branch_manager' && branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Sort: Latest First</SelectItem>
            <SelectItem value="branch_asc">Sort: Branch (A → Z)</SelectItem>
            <SelectItem value="branch_desc">Sort: Branch (Z → A)</SelectItem>
          </SelectContent>
        </Select>
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
            {s ? s.replace(/_/g, ' ').toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse border border-border" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center text-muted-foreground">
            <School className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No admissions found matching your criteria.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <Card key={e.id} className="group hover:border-primary/40 transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <div className="md:col-span-1 border-r border-border pr-4 h-full flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[e.status] || 'bg-muted text-muted-foreground')}>
                          {e.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-lg leading-tight">{e.studentName}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{e.enrollmentNumber || 'ID: ' + e.id.slice(0,8)}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-4">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <School className="w-4 h-4" />
                        <span>{e.program.university.name}</span>
                      </div>
                      <p className="text-sm font-medium pl-6">{e.program.name} ({e.program.code})</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm font-medium">{e.studyCenter.name}</span>
                        <Badge variant="outline" className="text-[10px]">{e.studyCenter.code}</Badge>
                        {(e.branchName || e.studyCenter?.branchName) && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                            🏢 {e.branchName || e.studyCenter?.branchName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-1 text-right flex flex-col justify-between h-full">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{e.studentEmail}</p>
                      <p>{e.studentPhone}</p>
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
