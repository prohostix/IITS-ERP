import { useState, useEffect, useMemo } from 'react';
import {
  Users, TrendingUp, Target, RefreshCw, Trophy, Medal, Award, ChevronDown, ChevronRight,
  GraduationCap, Building2, Search, FileSpreadsheet, CornerDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

interface Admission {
  id: string;
  studentName: string;
  studentPhone?: string;
  enrollmentNumber?: string | null;
  status: string;
  totalFee: number;
  admissionDate: string;
  centerName: string;
  centerCode?: string;
  programName: string;
  universityName: string;
  sessionName: string;
}

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  status: string;
  leads: number;
  converted: number;
  conversionRate: number;
  targetCount: number;
  targetAchieved: number;
  targetTotal: number;
  targetProgress: number;
  score: number;
  reportingTo?: string | null;
  reportingToName?: string | null;
  isDirectReport?: boolean;
  centersCount?: number;
  admissionsTotal?: number;
  admissionsEnrolled?: number;
  admissionsPending?: number;
  admissionsRejected?: number;
  admissionsRevenue?: number;
  admissions?: Admission[];
}

const REJECTED = ['rejected', 'department_rejected', 'cancelled', 'dropout', 'refunded'];

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

const statusLabel = (s: string) => (s || '').replace(/_/g, ' ');

const statusBadge = (s: string) => {
  if (s === 'enrolled') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (REJECTED.includes(s)) return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
  return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
};

const rankIcon = (i: number) => {
  if (i === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (i === 1) return <Medal className="w-4 h-4 text-slate-400" />;
  if (i === 2) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{i + 1}</span>;
};

const scoreColor = (score: number) => {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  if (score >= 25) return 'text-info';
  return 'text-muted-foreground';
};

export function TeamPerformancePanel() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<'members' | 'admissions'>('members');
  const [memberFilter, setMemberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/team-performance');
      setTeam(res.data.data || []);
    } catch {
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const totalLeads = team.reduce((s, m) => s + (m.leads || 0), 0);
  const totalConverted = team.reduce((s, m) => s + (m.converted || 0), 0);
  const totalAdmissions = team.reduce((s, m) => s + (m.admissionsTotal || 0), 0);
  const totalEnrolled = team.reduce((s, m) => s + (m.admissionsEnrolled || 0), 0);
  const totalRevenue = team.reduce((s, m) => s + (m.admissionsRevenue || 0), 0);
  const avgScore = team.length ? Math.round(team.reduce((s, m) => s + (m.score || 0), 0) / team.length) : 0;

  // Flattened admissions across the whole downline
  const allAdmissions = useMemo(
    () => team.flatMap(m => (m.admissions || []).map(a => ({ ...a, memberId: m.id, memberName: m.name, memberDesignation: m.designation, reportingToName: m.reportingToName }))),
    [team]
  );

  const filteredAdmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAdmissions.filter(a => {
      if (memberFilter !== 'all' && a.memberId !== memberFilter) return false;
      if (statusFilter === 'enrolled' && a.status !== 'enrolled') return false;
      if (statusFilter === 'pending' && (a.status === 'enrolled' || REJECTED.includes(a.status))) return false;
      if (statusFilter === 'rejected' && !REJECTED.includes(a.status)) return false;
      if (q && ![a.studentName, a.enrollmentNumber, a.centerName, a.programName, a.universityName, a.memberName]
        .some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allAdmissions, memberFilter, statusFilter, search]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const exportExcel = () => {
    const rows = filteredAdmissions.map((a, i) => ({
      '#': i + 1,
      'Team Member': a.memberName,
      'Designation': a.memberDesignation,
      'Reports To': a.reportingToName || '-',
      'Student': a.studentName,
      'Enrollment No': a.enrollmentNumber || '-',
      'Study Center': a.centerName,
      'University': a.universityName,
      'Program': a.programName,
      'Session': a.sessionName,
      'Admission Date': formatDate(a.admissionDate),
      'Status': statusLabel(a.status),
      'Fee': a.totalFee
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Admissions');
    XLSX.writeFile(wb, `Team_Admissions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const AdmissionsTable = ({ rows, showMember }: { rows: any[]; showMember?: boolean }) => (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-10 text-center">#</TableHead>
            {showMember && <TableHead>Team Member</TableHead>}
            <TableHead>Student</TableHead>
            <TableHead>Study Center</TableHead>
            <TableHead>University / Program</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showMember ? 9 : 8} className="h-20 text-center text-muted-foreground text-sm">
                No admissions found.
              </TableCell>
            </TableRow>
          ) : rows.map((a, i) => (
            <TableRow key={a.id} className="hover:bg-muted/20">
              <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
              {showMember && (
                <TableCell>
                  <p className="text-xs font-semibold">{a.memberName}</p>
                  <p className="text-[10px] text-muted-foreground">{a.memberDesignation}</p>
                </TableCell>
              )}
              <TableCell>
                <p className="text-xs font-semibold">{a.studentName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{a.enrollmentNumber || '—'}</p>
              </TableCell>
              <TableCell className="text-xs">{a.centerName}</TableCell>
              <TableCell>
                <p className="text-xs font-medium">{a.universityName}</p>
                <p className="text-[10px] text-muted-foreground">{a.programName}</p>
              </TableCell>
              <TableCell className="text-xs">{a.sessionName}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatDate(a.admissionDate)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{formatINR(a.totalFee)}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className={cn('text-[10px] capitalize whitespace-nowrap', statusBadge(a.status))}>
                  {statusLabel(a.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">My Team</h2>
          <p className="text-sm text-muted-foreground">Performance &amp; admission details of everyone below you in the hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
            <button
              onClick={() => setView('members')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', view === 'members' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >Team Members</button>
            <button
              onClick={() => setView('admissions')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', view === 'admissions' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >All Admissions ({allAdmissions.length})</button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTeam} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Team Size</p>
              <p className="text-2xl font-bold">{loading ? '...' : team.length}</p>
              <p className="text-[10px] text-muted-foreground">{team.filter(m => m.isDirectReport).length} direct reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Team Admissions</p>
              <p className="text-2xl font-bold">{loading ? '...' : totalAdmissions}</p>
              <p className="text-[10px] text-muted-foreground">{totalEnrolled} enrolled · {totalAdmissions - totalEnrolled} pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Admission Revenue</p>
              <p className="text-xl font-bold">{loading ? '...' : formatINR(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">{totalLeads} leads · {totalConverted} converted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning"><Target className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Avg Performance</p>
              <p className={cn('text-2xl font-bold', scoreColor(avgScore))}>{loading ? '...' : `${avgScore}%`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {view === 'members' ? (
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
            <CardDescription>Click a member to view all admissions credited to them</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : team.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No team members found</p>
                <p className="text-sm mt-1">Staff reporting to you (directly or indirectly) will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {team.map((member, i) => {
                  const open = !!expanded[member.id];
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'rounded-xl border transition-all',
                        i === 0 ? 'border-yellow-500/30 bg-yellow-500/5' :
                        i === 1 ? 'border-slate-400/30 bg-slate-400/5' :
                        i === 2 ? 'border-amber-600/30 bg-amber-600/5' :
                        'border-border bg-muted/20'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(member.id)}
                        className="w-full flex items-center gap-4 p-4 text-left"
                      >
                        <div className="shrink-0 text-muted-foreground">
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <div className="w-6 flex justify-center shrink-0">{rankIcon(i)}</div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(member.name?.[0] || '?').toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{member.name}</p>
                            {member.isDirectReport ? (
                              <Badge variant="outline" className="text-[9px] uppercase shrink-0 border-primary/40 text-primary">Direct</Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{member.designation}</p>
                          {member.reportingToName && !member.isDirectReport && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <CornerDownRight className="w-3 h-3" /> Reports to {member.reportingToName}
                            </p>
                          )}
                        </div>

                        <div className="hidden md:flex items-center gap-6 shrink-0">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Centers</p>
                            <p className="font-bold text-sm flex items-center justify-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />{member.centersCount || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Admissions</p>
                            <p className="font-bold text-sm">{member.admissionsTotal || 0}</p>
                            <p className="text-[10px] text-success">{member.admissionsEnrolled || 0} enrolled</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-bold text-sm">{formatINR(member.admissionsRevenue || 0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Leads</p>
                            <p className="font-bold text-sm">{member.leads}</p>
                            <p className="text-[10px] text-success">{member.converted} conv.</p>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <p className="text-xs text-muted-foreground">Target</p>
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, member.targetProgress)}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{member.targetProgress}%</p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                          <p className={cn('text-lg font-bold', scoreColor(member.score))}>{member.score}</p>
                        </div>
                      </button>

                      {open && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Total: {member.admissionsTotal || 0}</Badge>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Enrolled: {member.admissionsEnrolled || 0}</Badge>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending: {member.admissionsPending || 0}</Badge>
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">Rejected: {member.admissionsRejected || 0}</Badge>
                          </div>
                          <AdmissionsTable rows={member.admissions || []} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle>Team Admissions</CardTitle>
              <CardDescription>All admissions from your downline's study centers</CardDescription>
            </div>
            <Button size="sm" onClick={exportExcel} disabled={filteredAdmissions.length === 0} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search student, center, program..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Team member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {team.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.admissionsTotal || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="pending">Pending / In Review</SelectItem>
                  <SelectItem value="rejected">Rejected / Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
            ) : (
              <AdmissionsTable rows={filteredAdmissions} showMember />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
