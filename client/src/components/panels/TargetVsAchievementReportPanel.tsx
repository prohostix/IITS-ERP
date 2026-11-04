import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function TargetVsAchievementReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    targets: any[];
    overall: any;
  }>({
    targets: [],
    overall: {
      totalTargetsCount: 0,
      exceededCount: 0,
      onTrackCount: 0,
      laggingCount: 0,
      totalTargetAdmissions: 0,
      totalAchievedAdmissions: 0,
      admissionAchievementRate: 0,
      totalTargetRevenue: 0,
      totalAchievedRevenue: 0,
      revenueAchievementRate: 0
    }
  });

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year !== 'all') params.set('year', year);
      if (month !== 'all') params.set('month', month);
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/sales/reports/target-vs-achievement?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Target vs. Achievement report');
    } finally {
      setLoading(false);
    }
  }, [year, month, type, status, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    if (!data.targets || data.targets.length === 0) {
      toast.error('No target data to export');
      return;
    }

    const rows = data.targets.map((t, i) => ({
      '#': i + 1,
      'Staff / Entity': t.employee ? t.employee.name : (t.center?.name || 'Department'),
      'Role / Designation': t.employee ? `${t.employee.designation} (${t.employee.role})` : '-',
      'Branch': t.employee?.branch || '-',
      'Reporting TL': t.reportingTL ? `${t.reportingTL.name} (${t.reportingTL.designation})` : '-',
      'Target Type': t.type,
      'Period': t.period,
      'Target Goal': t.targetValue,
      'Achieved Value': t.achievedValue,
      'Variance': t.variance,
      'Achievement %': `${t.percentage}%`,
      'Performance Status': t.performanceStatus.toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Target vs Achievement');
    XLSX.writeFile(wb, `Target_vs_Achievement_${year}_M${month}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const getStatusBadge = (perfStatus: string, pct: number) => {
    switch (perfStatus) {
      case 'exceeded':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Exceeded ({pct}%)</Badge>;
      case 'on_track':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">On Track ({pct}%)</Badge>;
      case 'lagging':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Lagging ({pct}%)</Badge>;
      default:
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Critical ({pct}%)</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Target vs. Achievement Report</h1>
              <p className="text-sm text-muted-foreground">
                Monthly performance evaluation comparing target goals against actual live achievements
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
        {/* Admission Target vs Achieved */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admissions Progress</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {data.overall.totalAchievedAdmissions} / {data.overall.totalTargetAdmissions}
              <Users className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Achievement Rate</span>
              <span className="font-bold text-primary">{data.overall.admissionAchievementRate}%</span>
            </div>
            <Progress value={Math.min(100, data.overall.admissionAchievementRate)} className="h-2" />
          </CardContent>
        </Card>

        {/* Revenue Target vs Achieved */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Progress</CardDescription>
            <CardTitle className="text-lg font-bold flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.overall.totalAchievedRevenue)}
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Target: {formatCurrency(data.overall.totalTargetRevenue)}</span>
              <span className="font-bold text-emerald-600">{data.overall.revenueAchievementRate}%</span>
            </div>
            <Progress value={Math.min(100, data.overall.revenueAchievementRate)} className="h-2 bg-emerald-100 dark:bg-emerald-950" />
          </CardContent>
        </Card>

        {/* Exceeded Target */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achieved / Exceeded (≥100%)</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {data.overall.exceededCount}
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Staff exceeding monthly target</p>
          </CardContent>
        </Card>

        {/* Lagging / Critical */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention (&lt;70%)</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 flex items-center justify-between">
              {data.overall.laggingCount}
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Targets currently behind schedule</p>
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
                placeholder="Search staff, TL, center..."
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

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Target Types</SelectItem>
                <SelectItem value="admission">Admissions</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Performance Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="exceeded">Exceeded (≥100%)</SelectItem>
                <SelectItem value="on_track">On Track (70% - 99%)</SelectItem>
                <SelectItem value="lagging">Lagging (&lt;70%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Target vs Achievement Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Staff / Center</TableHead>
                <TableHead>Team Leader (TL)</TableHead>
                <TableHead>Target Type & Period</TableHead>
                <TableHead className="text-right">Target Goal</TableHead>
                <TableHead className="text-right">Live Achieved</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="w-48">Progress</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading target performance data...
                  </TableCell>
                </TableRow>
              ) : data.targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No target records found matching the specified filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.targets.map((t, idx) => {
                  const isRevenue = t.type.toLowerCase().includes('revenue');
                  const isPositive = t.variance >= 0;

                  return (
                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-center font-medium text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">
                            {t.employee ? t.employee.name : (t.center?.name || 'Department Target')}
                          </p>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{t.employee?.designation || t.center?.code || 'Sales'}</span>
                            <span>•</span>
                            <span>{t.employee?.branch || 'Main Branch'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {t.reportingTL ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground">{t.reportingTL.name}</p>
                            <p className="text-[10px] text-muted-foreground">{t.reportingTL.designation}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-xs font-medium capitalize">
                            {t.type}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground capitalize">{t.period}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-semibold text-xs">
                        {isRevenue ? formatCurrency(t.targetValue) : t.targetValue}
                      </TableCell>

                      <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {isRevenue ? formatCurrency(t.achievedValue) : t.achievedValue}
                      </TableCell>

                      <TableCell className="text-right font-medium text-xs">
                        <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-600 font-semibold' : 'text-rose-600'}`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isRevenue ? formatCurrency(Math.abs(t.variance)) : Math.abs(t.variance)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Achievement</span>
                            <span className="font-bold">{t.percentage}%</span>
                          </div>
                          <Progress
                            value={Math.min(100, t.percentage)}
                            className="h-2"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {getStatusBadge(t.performanceStatus, t.percentage)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

export default TargetVsAchievementReportPanel;
