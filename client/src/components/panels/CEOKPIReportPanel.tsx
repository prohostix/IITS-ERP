import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, Search, Target, Award, Star, ChevronDown, ChevronUp,
  Users, TrendingUp, AlertCircle, CheckCircle2, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPI {
  id: string; title: string; description?: string;
  target: number; achieved: number; unit: string;
  period: string; status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
}
interface KRA {
  id: string; area: string; description?: string;
  weightage: number; rating?: number; remarks?: string;
}
interface EmployeeReport {
  userId: string; name: string; email: string;
  designation?: string; role: string; department: string; status: string;
  overallRating?: number; lastReviewDate?: string; nextReviewDate?: string; reviewRemarks?: string;
  kpis: KPI[]; kpiSummary: { total: number; achieved: number; atRisk: number; missed: number; avgPct: number };
  kras: KRA[]; kraSummary: { total: number; avgRating: string | null; totalWeightage: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KPI_STATUS: Record<string, { label: string; cls: string }> = {
  on_track: { label: 'On Track', cls: 'bg-blue-100 text-blue-700' },
  at_risk:  { label: 'At Risk',  cls: 'bg-yellow-100 text-yellow-700' },
  achieved: { label: 'Achieved', cls: 'bg-green-100 text-green-700' },
  missed:   { label: 'Missed',   cls: 'bg-red-100 text-red-700' },
};

function StarRow({ value }: { value?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={cn('w-3.5 h-3.5', n <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

function KpiBar({ kpi }: { kpi: KPI }) {
  const pct = Math.min(100, Math.round((kpi.achieved / kpi.target) * 100));
  const st = KPI_STATUS[kpi.status];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium truncate max-w-[180px]">{kpi.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground">{kpi.achieved}/{kpi.target} {kpi.unit}</span>
          <Badge className={cn('text-[9px] py-0 px-1.5', st.cls)}>{st.label}</Badge>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-yellow-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Period: {kpi.period} · {pct}% complete</p>
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeKPICard({ emp }: { emp: EmployeeReport }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {emp.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{emp.name}</p>
              <p className="text-xs text-muted-foreground">{emp.designation || emp.role.replace(/_/g, ' ')} · {emp.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {emp.overallRating && <StarRow value={emp.overallRating} />}
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {emp.kpis.length > 0 && (
            <>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {emp.kpiSummary.achieved}/{emp.kpiSummary.total} KPIs achieved
              </span>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium">
                Avg {emp.kpiSummary.avgPct}%
              </span>
              {emp.kpiSummary.atRisk > 0 && (
                <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  {emp.kpiSummary.atRisk} at risk
                </span>
              )}
              {emp.kpiSummary.missed > 0 && (
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {emp.kpiSummary.missed} missed
                </span>
              )}
            </>
          )}
          {emp.kras.length > 0 && emp.kraSummary.avgRating && (
            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              KRA avg: {emp.kraSummary.avgRating}/5
            </span>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {emp.kpis.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> KPIs
                </p>
                <div className="space-y-3">
                  {emp.kpis.map(kpi => <KpiBar key={kpi.id} kpi={kpi} />)}
                </div>
              </div>
            )}

            {emp.kras.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Award className="w-3 h-3" /> KRAs
                  {emp.kraSummary.totalWeightage !== 100 && (
                    <span className="text-yellow-600 ml-1">({emp.kraSummary.totalWeightage}% total)</span>
                  )}
                </p>
                <div className="space-y-2">
                  {emp.kras.map(kra => (
                    <div key={kra.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{kra.area}</p>
                        <p className="text-[10px] text-muted-foreground">Weightage: {kra.weightage}%{kra.remarks ? ` · "${kra.remarks}"` : ''}</p>
                      </div>
                      <StarRow value={kra.rating} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emp.reviewRemarks && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground italic">
                "{emp.reviewRemarks}"
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function CEOKPIReportPanel() {
  const [data, setData] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/kpi-kra-report');
      setData(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load KPI/KRA report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const filtered = data.filter(emp => {
    const matchSearch = !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(search.toLowerCase());

    if (tab === 'at_risk') return matchSearch && emp.kpiSummary.atRisk > 0;
    if (tab === 'missed')  return matchSearch && emp.kpiSummary.missed > 0;
    if (tab === 'top')     return matchSearch && (emp.overallRating || 0) >= 4;
    return matchSearch;
  });

  // Org-wide stats
  const totalEmployees = data.length;
  const totalKPIs = data.reduce((s, e) => s + e.kpis.length, 0);
  const achievedKPIs = data.reduce((s, e) => s + e.kpiSummary.achieved, 0);
  const atRiskCount = data.filter(e => e.kpiSummary.atRisk > 0).length;
  const avgOrgRating = data.filter(e => e.overallRating).length
    ? (data.reduce((s, e) => s + (e.overallRating || 0), 0) / data.filter(e => e.overallRating).length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">KPI & KRA Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Organisation-wide performance indicators and key result areas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-1', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* Org-wide summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
          <div><p className="text-2xl font-bold">{totalEmployees}</p><p className="text-xs text-muted-foreground">Employees with data</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100 text-green-700"><CheckCircle2 className="w-5 h-5" /></div>
          <div><p className="text-2xl font-bold">{achievedKPIs}/{totalKPIs}</p><p className="text-xs text-muted-foreground">KPIs Achieved</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-100 text-yellow-700"><AlertCircle className="w-5 h-5" /></div>
          <div><p className="text-2xl font-bold">{atRiskCount}</p><p className="text-xs text-muted-foreground">Employees at risk</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700"><TrendingUp className="w-5 h-5" /></div>
          <div><p className="text-2xl font-bold">{avgOrgRating}</p><p className="text-xs text-muted-foreground">Avg overall rating</p></div>
        </CardContent></Card>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, dept..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="at_risk">At Risk ({data.filter(e => e.kpiSummary.atRisk > 0).length})</TabsTrigger>
          <TabsTrigger value="missed">Missed KPIs ({data.filter(e => e.kpiSummary.missed > 0).length})</TabsTrigger>
          <TabsTrigger value="top">Top Rated ({data.filter(e => (e.overallRating || 0) >= 4).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{data.length === 0 ? 'No KPI/KRA data found. HR needs to add them via employee profiles.' : 'No employees match this filter.'}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(emp => <EmployeeKPICard key={emp.userId} emp={emp} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
