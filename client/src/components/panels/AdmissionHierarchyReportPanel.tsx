import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Download,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Network
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

export function AdmissionHierarchyReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    centers: any[];
    authoritySummary: any[];
    overall: any;
    availableManagers: any[];
  }>({
    centers: [],
    authoritySummary: [],
    overall: { totalCenters: 0, totalAdmissions: 0, completedAdmissions: 0, pendingAdmissions: 0, rejectedAdmissions: 0, totalRevenue: 0, activeAuthoritiesCount: 0 },
    availableManagers: []
  });

  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [selectedManager, setSelectedManager] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year !== 'all') params.set('year', year);
      if (month !== 'all') params.set('month', month);
      if (selectedManager !== 'all') params.set('managerId', selectedManager);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/sales/reports/admission-hierarchy?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load admission hierarchy report');
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedManager, statusFilter, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    if (!data.centers || data.centers.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const rows = data.centers.map((c, idx) => ({
      '#': idx + 1,
      'Center Name': c.centerName,
      'Center Code': c.centerCode || '-',
      'Branch': c.branchName || '-',
      'Center Status': c.status || 'Active',
      'Completed Admissions': c.completedAdmissions,
      'Pending Applications': c.pendingAdmissions,
      'Total Admissions': c.totalAdmissions,
      'Revenue Collected': c.totalRevenue,
      'Assigned BDE / Staff': c.assignedStaff ? `${c.assignedStaff.name} (${c.assignedStaff.designation})` : 'Unassigned',
      'Team Leader (TL)': c.teamLeader ? `${c.teamLeader.name} (${c.teamLeader.designation})` : '-',
      'Asst BDM / BDM': c.assistantBDM ? `${c.assistantBDM.name} (${c.assistantBDM.designation})` : '-',
      'District / Branch Mgr': c.districtManager ? `${c.districtManager.name} (${c.districtManager.designation})` : (c.branchManager ? `${c.branchManager.name} (${c.branchManager.designation || 'Branch Manager'})` : '-'),
      'Hierarchy Chain': c.hierarchyText
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Center Admissions Hierarchy');
    XLSX.writeFile(wb, `Center_Admissions_Hierarchy_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admission Report (Hierarchy)</h1>
              <p className="text-sm text-muted-foreground">
                Total completed admissions by each study center attributed against TL, BDE, and reporting authorities
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Study Centers</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {data.overall.totalCenters}
              <Building2 className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Contributing centers in branch</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Admissions</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              {data.overall.completedAdmissions}
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Enrolled students across centers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Review / Pending</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
              {data.overall.pendingAdmissions}
              <Clock className="w-5 h-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Applications pending verification</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Fee Revenue</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-between">
              {formatCurrency(data.overall.totalRevenue)}
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total admissions value generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-border/60 shadow-sm bg-card/40 backdrop-blur-sm">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search center, code, staff, TL..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Reporting Authority / TL" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authorities</SelectItem>
                {data.availableManagers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.designation || 'Manager'})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="enrolled">Enrolled Only</SelectItem>
                <SelectItem value="pending">In Review / Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="centers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="centers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Center-Wise Attribution ({data.centers.length})
          </TabsTrigger>
          <TabsTrigger value="authorities" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Authority Roll-up ({data.authoritySummary.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Center-Wise Attribution */}
        <TabsContent value="centers" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Study Center</TableHead>
                    <TableHead className="text-center">Admissions</TableHead>
                    <TableHead>Assigned BDE / Staff</TableHead>
                    <TableHead>Team Leader (TL)</TableHead>
                    <TableHead>Assistant BDM / BDM</TableHead>
                    <TableHead>District / Branch Mgr</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading center admissions hierarchy...
                      </TableCell>
                    </TableRow>
                  ) : data.centers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No centers found matching the specified filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.centers.map((c, i) => (
                      <TableRow key={c.centerId} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {c.centerName}
                              {c.centerCode && <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">{c.centerCode}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>Branch: {c.branchName}</span>
                              <span>•</span>
                              <Badge variant={c.status === 'active' || c.status === 'verified' ? 'outline' : 'secondary'} className="text-[9px] uppercase px-1 py-0">
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {c.completedAdmissions}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {c.totalAdmissions} total
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {c.assignedStaff ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground">{c.assignedStaff.name}</p>
                              <p className="text-[11px] text-muted-foreground">{c.assignedStaff.designation}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {c.teamLeader ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-foreground">{c.teamLeader.name}</p>
                              <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">{c.teamLeader.designation}</Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {c.assistantBDM ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-foreground">{c.assistantBDM.name}</p>
                              <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/20">{c.assistantBDM.designation}</Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {c.districtManager ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-foreground">{c.districtManager.name}</p>
                              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">{c.districtManager.designation}</Badge>
                            </div>
                          ) : c.branchManager ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-foreground">{c.branchManager.name}</p>
                              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Branch Manager</Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-medium text-xs">
                          {formatCurrency(c.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Hierarchy Roll-up Summary */}
        <TabsContent value="authorities" className="mt-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Reporting Authority</TableHead>
                    <TableHead>Designation / Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-center">Subordinates</TableHead>
                    <TableHead className="text-center">Centers Managed</TableHead>
                    <TableHead className="text-center">Completed Admissions</TableHead>
                    <TableHead className="text-center">Total Applications</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Calculating authority roll-up summary...
                      </TableCell>
                    </TableRow>
                  ) : data.authoritySummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        No reporting authorities with active centers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.authoritySummary.map((item, i) => (
                      <TableRow key={item.authority.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{item.authority.name}</div>
                          <div className="text-xs text-muted-foreground">{item.authority.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {item.authority.designation || item.authority.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.authority.branch || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs">
                          {item.subordinatesCount}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs text-blue-600 dark:text-blue-400">
                          {item.centersCount}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {item.completedAdmissions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">
                          {item.totalAdmissions}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-primary">
                          {formatCurrency(item.totalRevenue)}
                        </TableCell>
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

export default AdmissionHierarchyReportPanel;
