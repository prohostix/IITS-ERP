import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const statusColor = (s: string) => {
  if (!s) return 'bg-gray-100 text-gray-500';
  const l = s.toLowerCase();
  if (l === 'paid') return 'bg-green-100 text-green-700 border border-green-200';
  if (l === 'due' || l === 'pending') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (l === 'not applicable') return 'bg-slate-100 text-slate-400';
  return 'bg-blue-100 text-blue-700';
};

export function FinanceTotalReportPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [universityId, setUniversityId] = useState('__all__');
  const [programId, setProgramId] = useState('__all__');
  const [sessionId, setSessionId] = useState('__all__');

  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/operations/universities').catch(() => ({ data: { data: [] } })),
      api.get('/operations/programs').catch(() => ({ data: { data: [] } })),
      api.get('/operations/sessions').catch(() => ({ data: { data: [] } })),
    ]).then(([uRes, pRes, sRes]) => {
      setUniversities(uRes.data.data || []);
      setPrograms(pRes.data.data || []);
      setSessions(sRes.data.data || []);
    });
    fetchReport({});
  }, []);

  const fetchReport = useCallback(async (overrides: any) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const uid = overrides.universityId !== undefined ? overrides.universityId : universityId;
      const pid = overrides.programId !== undefined ? overrides.programId : programId;
      const sid = overrides.sessionId !== undefined ? overrides.sessionId : sessionId;
      const s = overrides.search !== undefined ? overrides.search : search;
      if (uid && uid !== '__all__') params.set('universityId', uid);
      if (pid && pid !== '__all__') params.set('programId', pid);
      if (sid && sid !== '__all__') params.set('sessionId', sid);
      if (s) params.set('search', s);
      const res = await api.get(`/finance/total-report?${params.toString()}`);
      setRows(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [universityId, programId, sessionId, search]);

  const handleFilter = () => fetchReport({});

  const handleReset = () => {
    setSearch('');
    setUniversityId('__all__');
    setProgramId('__all__');
    setSessionId('__all__');
    fetchReport({ universityId: '__all__', programId: '__all__', sessionId: '__all__', search: '' });
  };

  const exportExcel = () => {
    const data = rows.map((r, i) => ({
      '#': i + 1,
      'Student': r.studentName,
      'Enrollment No': r.enrollmentNumber || '',
      'Admission Session': r.admissionSession,
      'Center Name': r.centerName,
      'Sub Center / Branch': r.subCenterName || '',
      'Program': r.program,
      'University': r.university,
      'Center Payment (INR)': r.centerPaymentAmount ?? '',
      'Center Payment Status': r.centerPaymentStatus,
      'Payment For': r.centerPaymentFor,
      'University Payment (INR)': r.universityPaymentAmount ?? '',
      'University Payment Status': r.universityPaymentStatus,
      'Coordinator Name': r.coordinatorName || 'Null',
      'Coordinator Payment (INR)': r.coordinatorPaymentAmount ?? '',
      'Coordinator Payment Status': r.coordinatorPaymentStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Total Report');
    ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 22 }));
    XLSX.writeFile(wb, `finance_total_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported successfully');
  };

  const totalCenterPaid = rows.filter(r => r.centerPaymentStatus === 'Paid').reduce((s, r) => s + (r.centerPaymentAmount || 0), 0);
  const totalCenterDue = rows.filter(r => r.centerPaymentStatus === 'Due').length;
  const totalUniPaid = rows.filter(r => r.universityPaymentStatus === 'paid').reduce((s, r) => s + (r.universityPaymentAmount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Total Data Report</h2>
          <p className="text-muted-foreground text-sm">Complete enrollment, payment and coordinator fee overview</p>
        </div>
        <Button onClick={exportExcel} disabled={rows.length === 0} className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: rows.length, color: 'text-slate-700' },
          { label: 'Center Fees Collected', value: 'INR ' + totalCenterPaid.toLocaleString('en-IN'), color: 'text-green-700' },
          { label: 'Center Fees Due', value: totalCenterDue + ' students', color: 'text-amber-700' },
          { label: 'University Fees Paid', value: 'INR ' + totalUniPaid.toLocaleString('en-IN'), color: 'text-blue-700' },
        ].map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={'text-xl font-bold mt-1 ' + stat.color}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search student / center..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
              />
            </div>
            <Select value={universityId} onValueChange={v => setUniversityId(v)}>
              <SelectTrigger><SelectValue placeholder="All Universities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Universities</SelectItem>
                {universities.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={programId} onValueChange={v => setProgramId(v)}>
              <SelectTrigger><SelectValue placeholder="All Programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Programs</SelectItem>
                {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sessionId} onValueChange={v => setSessionId(v)}>
              <SelectTrigger><SelectValue placeholder="All Sessions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sessions</SelectItem>
                {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleFilter} disabled={loading}>
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Apply Filters
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading report...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No data found. Adjust filters and try again.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-max w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    {[
                      '#', 'Student', 'Enroll No', 'Admission Session', 'Center Name', 'Sub Center (Branch)',
                      'Program', 'University',
                      'Payment (INR)', 'Payment Status', 'Payment For',
                      'University Payment (INR)', 'Uni. Payment Status',
                      'Coordinator Name', 'Coord. Payment (INR)', 'Coord. Status',
                    ].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.studentName}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{r.enrollmentNumber || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.admissionSession || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.centerName || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.subCenterName || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.program || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.university || '-'}</td>
                      <td className="px-3 py-2.5 font-semibold">
                        {r.centerPaymentAmount != null ? 'INR ' + Number(r.centerPaymentAmount).toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + statusColor(r.centerPaymentStatus)}>
                          {r.centerPaymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                        {r.centerPaymentFor?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-3 py-2.5 font-semibold">
                        {r.universityPaymentAmount != null ? 'INR ' + Number(r.universityPaymentAmount).toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + statusColor(r.universityPaymentStatus)}>
                          {r.universityPaymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.coordinatorName || 'Null'}</td>
                      <td className="px-3 py-2.5 font-semibold">
                        {r.coordinatorPaymentAmount != null ? 'INR ' + Number(r.coordinatorPaymentAmount).toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + statusColor(r.coordinatorPaymentStatus)}>
                          {r.coordinatorPaymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
