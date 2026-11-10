import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  GraduationCap,
  Building2,
  Users,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function SessionReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    session: any;
    availableSessions: any[];
    overview: any;
    byHierarchy: any[];
    byCenter: any[];
    byProgram: any[];
    admissions: any[];
  }>({
    session: null,
    availableSessions: [],
    overview: { total: 0, completed: 0, pending: 0, rejected: 0, totalRevenue: 0, centersCount: 0, programsCount: 0, overallConversionRate: 0 },
    byHierarchy: [],
    byCenter: [],
    byProgram: [],
    admissions: []
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSessionId && selectedSessionId !== 'all') params.set('sessionId', selectedSessionId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/sales/reports/session-report?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
        if (res.data.data.session && !selectedSessionId) {
          setSelectedSessionId(res.data.data.session.id);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load session report');
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId, statusFilter, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    if (!data.admissions || data.admissions.length === 0) {
      toast.error('No admissions in this session to export');
      return;
    }

    const sessionName = data.session?.name || 'Session';

    // Sheet 1: Admissions List
    const admissionsRows = data.admissions.map((a, i) => ({
      '#': i + 1,
      'Enrollment Number': a.enrollmentNumber,
      'Student Name': a.studentName,
      'Program': a.programName,
      'University': a.universityName,
      'Study Center': a.studyCenterName,
      'Center Code': a.studyCenterCode || '-',
      'Sales Staff (BDE)': a.salesStaffName,
      'Team Leader (TL)': a.reportingTL,
      'Admission Date': formatDate(a.admissionDate),
      'Status': a.status.toUpperCase(),
      'Total Fee': a.totalFee
    }));

    // Sheet 2: Hierarchy Team Breakdown
    const teamRows = data.byHierarchy.map((h, i) => ({
      '#': i + 1,
      'Staff Name': h.staff.name,
      'Designation': h.staff.designation || h.staff.role,
      'Team Leader (TL)': h.reportingTL?.name || '-',
      'Branch': h.staff.branch || 'N/A',
      'Contributing Centers': h.centersCount,
      'Total Admissions': h.total,
      'Completed': h.completed,
      'Pending': h.pending,
      'Rejected': h.rejected,
      'Session Revenue': h.revenue,
      'Conversion Rate %': `${h.conversionRate}%`
    }));

    // Sheet 3: Centers Breakdown
    const centerRows = data.byCenter.map((c, i) => ({
      '#': i + 1,
      'Center Name': c.center.name,
      'Center Code': c.center.code || '-',
      'Branch': c.center.branchName || '-',
      'Referrer Staff': c.referrer?.name || 'Direct',
      'Team Leader (TL)': c.reportingTL?.name || '-',
      'Total Admissions': c.total,
      'Completed': c.completed,
      'Pending': c.pending,
      'Top Program': c.topProgram,
      'Session Revenue': c.revenue,
      'Conversion %': `${c.conversionRate}%`
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(admissionsRows);
    const ws2 = XLSX.utils.json_to_sheet(teamRows);
    const ws3 = XLSX.utils.json_to_sheet(centerRows);

    XLSX.utils.book_append_sheet(wb, ws1, 'Admissions');
    XLSX.utils.book_append_sheet(wb, ws2, 'Team Breakdown');
    XLSX.utils.book_append_sheet(wb, ws3, 'Centers Breakdown');

    XLSX.writeFile(wb, `Session_Report_${sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Session report exported to Excel');
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'enrolled':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Enrolled</Badge>;
      case 'rejected':
      case 'department_rejected':
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">In Review</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Session Report</h1>
              <p className="text-sm text-muted-foreground">
                Intake session admissions accessible to BDEs, TLs, Assistant BDMs, DMs, and Branch Managers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportExcel} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Session Selector & Filters */}
      <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Admission Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent>
                  {data.availableSessions.map(s => {
                    const uniLabel = s.university?.code || s.university?.name;
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {uniLabel ? `• ${uniLabel}` : ''} {s.status === 'active' ? '(Active)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="enrolled">Enrolled Only</SelectItem>
                  <SelectItem value="pending">In Review / Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search Record</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student, enrollment #, program, center, BDE..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Admissions</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {data.overview.total}
              <GraduationCap className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{data.overview.sessionName || 'Selected Session'}</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed (Enrolled)</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              {data.overview.completed}
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
              {data.overview.overallConversionRate}% Conversion
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Centers</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {data.overview.centersCount}
              <Building2 className="w-5 h-5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{data.overview.programsCount} Programs Enrolled</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Revenue</CardDescription>
            <CardTitle className="text-lg font-bold text-primary flex items-center justify-between">
              {formatCurrency(data.overview.totalRevenue)}
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total fee collection for session</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="team">Team ({data.byHierarchy.length})</TabsTrigger>
          <TabsTrigger value="centers">Centers ({data.byCenter.length})</TabsTrigger>
          <TabsTrigger value="programs">Programs ({data.byProgram.length})</TabsTrigger>
          <TabsTrigger value="admissions">All Records ({data.admissions.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Team & Hierarchy Breakdown */}
        <TabsContent value="team" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Sales Staff (BDE / TL / Mgr)</TableHead>
                    <TableHead>Reporting TL</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-center">Contributing Centers</TableHead>
                    <TableHead className="text-center">Total Admissions</TableHead>
                    <TableHead className="text-center">Enrolled</TableHead>
                    <TableHead className="text-center">In Review</TableHead>
                    <TableHead className="text-right">Session Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading team performance...
                      </TableCell>
                    </TableRow>
                  ) : data.byHierarchy.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        No team admissions found for this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byHierarchy.map((h, i) => (
                      <TableRow key={h.staff.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{h.staff.name}</div>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{h.staff.designation || h.staff.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {h.reportingTL ? (
                            <span className="text-xs font-medium text-foreground">{h.reportingTL.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.staff.branch || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs text-purple-600">
                          {h.centersCount}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {h.total}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {h.completed}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs text-amber-600">
                          {h.pending}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-primary">
                          {formatCurrency(h.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Centers Breakdown */}
        <TabsContent value="centers" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Study Center</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Referring BDE / Staff</TableHead>
                    <TableHead>Team Leader (TL)</TableHead>
                    <TableHead className="text-center">Total Admissions</TableHead>
                    <TableHead className="text-center">Enrolled</TableHead>
                    <TableHead>Top Program</TableHead>
                    <TableHead className="text-right">Session Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCenter.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        No centers found for this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byCenter.map((c, i) => (
                      <TableRow key={c.center.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {c.center.name}
                            {c.center.code && <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">{c.center.code}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.center.branchName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {c.referrer ? (
                            <span className="text-xs font-medium text-foreground">{c.referrer.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Direct</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.reportingTL ? (
                            <span className="text-xs font-medium text-foreground">{c.reportingTL.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {c.total}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {c.completed}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {c.topProgram}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-primary">
                          {formatCurrency(c.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Programs Breakdown */}
        <TabsContent value="programs" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Program Code</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead className="text-center">Total Admissions</TableHead>
                    <TableHead className="text-center">Completed Enrolled</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProgram.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No programs found for this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byProgram.map((p, i) => (
                      <TableRow key={p.programName + i} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">{p.programName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-mono">{p.programCode || '-'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.universityName}</TableCell>
                        <TableCell className="text-center font-bold text-xs">{p.total}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-emerald-600">{p.completed}</TableCell>
                        <TableCell className="text-right font-bold text-xs text-primary">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: All Detailed Admissions */}
        <TabsContent value="admissions" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Enrollment #</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Study Center</TableHead>
                    <TableHead>Sales Staff (BDE)</TableHead>
                    <TableHead>TL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.admissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        No student admission records found for this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.admissions.map((a, i) => (
                      <TableRow key={a.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{a.studentName}</div>
                          <div className="text-[10px] text-muted-foreground">{a.studentPhone}</div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{a.enrollmentNumber}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">{a.programName}</div>
                          <div className="text-[10px] text-muted-foreground">{a.universityName}</div>
                        </TableCell>
                        <TableCell className="text-xs">{a.studyCenterName}</TableCell>
                        <TableCell className="text-xs font-medium">{a.salesStaffName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.reportingTL}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(a.admissionDate)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(a.status)}</TableCell>
                        <TableCell className="text-right font-semibold text-xs">{formatCurrency(a.totalFee)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SessionReportPanel;
