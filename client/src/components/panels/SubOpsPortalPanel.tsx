import { useState, useEffect } from 'react';
import {
  Building2, BookOpen, GraduationCap, MapPin, RefreshCw, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function SubOpsPortalPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sub-departments/my');
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="py-16 text-center text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No sub-department assigned to your account.</p>
        <p className="text-sm mt-1">Contact your operations admin to get assigned.</p>
      </CardContent></Card>
    );
  }

  const { subDepartment: sd, enrollmentStats, monthlyEnrollments } = data;

  const universities: any[] = sd.assignedUniversities || [];
  const programs: any[] = sd.assignedPrograms || [];
  const centers: any[] = sd.assignedCenters || [];

  // Aggregate enrollment totals
  const totalEnrolled = enrollmentStats.reduce((s: number, e: any) => s + (e.enrolled || 0), 0);
  const totalPending = enrollmentStats.reduce((s: number, e: any) => s + (e.pending || 0), 0);
  const totalAll = enrollmentStats.reduce((s: number, e: any) => s + (e.total || 0), 0);

  // Build center enrollment map
  const centerEnrollMap: Record<string, any> = {};
  enrollmentStats.forEach((e: any) => { centerEnrollMap[e.id?.toString()] = e; });

  // Monthly chart data
  const chartData = monthlyEnrollments.map((m: any) => ({
    month: MONTH_NAMES[(m.id.month - 1)],
    total: m.total,
    enrolled: m.enrolled,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{sd.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {typeof sd.parentDeptId === 'object' ? sd.parentDeptId?.name : 'Operations'} · Sub-Department Portal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Building2 className="w-5 h-5" />} label="Universities" value={universities.length} color="primary" />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Programs" value={programs.length} color="info" />
        <StatCard icon={<MapPin className="w-5 h-5" />} label="Study Centers" value={centers.length} color="success" />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Enrolled" value={totalEnrolled} color="warning" sub={`${totalPending} pending`} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="universities">Universities ({universities.length})</TabsTrigger>
          <TabsTrigger value="programs">Programs ({programs.length})</TabsTrigger>
          <TabsTrigger value="centers">Study Centers ({centers.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly enrollment chart */}
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Monthly Enrollments
                </CardTitle>
                <CardDescription>Last 6 months — your assigned centers</CardDescription>
              </CardHeader>
              <CardContent className="h-[220px]">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No enrollment data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px' }} />
                      <Bar dataKey="total" name="Total" radius={[4,4,0,0]} barSize={28} fill="hsl(var(--primary))" opacity={0.4} />
                      <Bar dataKey="enrolled" name="Enrolled" radius={[4,4,0,0]} barSize={28} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Center enrollment breakdown */}
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Center Breakdown</CardTitle>
                <CardDescription>Enrollment status per study center</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[220px] overflow-y-auto">
                {centers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No centers assigned</p>
                ) : centers.map((c: any) => {
                  const stats = centerEnrollMap[c.id?.toString()] || { total: 0, enrolled: 0, pending: 0 };
                  const pct = stats.total > 0 ? Math.round((stats.enrolled / stats.total) * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[200px]">{c.name} <span className="text-muted-foreground">({c.code})</span></span>
                        <span className="text-muted-foreground">{stats.enrolled}/{stats.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Quick lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickList title="Universities" items={universities} icon={<Building2 className="w-3.5 h-3.5" />} />
            <QuickList title="Programs" items={programs} icon={<BookOpen className="w-3.5 h-3.5" />} />
            <QuickList title="Study Centers" items={centers} icon={<MapPin className="w-3.5 h-3.5" />} />
          </div>
        </TabsContent>

        {/* Universities */}
        <TabsContent value="universities">
          <ResourceGrid items={universities} type="university" />
        </TabsContent>

        {/* Programs */}
        <TabsContent value="programs">
          <ResourceGrid items={programs} type="program" />
        </TabsContent>

        {/* Study Centers */}
        <TabsContent value="centers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.length === 0 ? (
              <p className="text-muted-foreground col-span-3 text-center py-8">No study centers assigned</p>
            ) : centers.map((c: any) => {
              const stats = centerEnrollMap[c.id?.toString()] || { total: 0, enrolled: 0, pending: 0 };
              return (
                <Card key={c.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code} · {c.city}, {c.state}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-[9px] uppercase', c.status === 'active' ? 'text-success border-success/30' : 'text-muted-foreground')}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-sm">{stats.total}</p>
                      </div>
                      <div className="bg-success/10 rounded-lg p-2">
                        <p className="text-xs text-success">Enrolled</p>
                        <p className="font-bold text-sm text-success">{stats.enrolled}</p>
                      </div>
                      <div className="bg-warning/10 rounded-lg p-2">
                        <p className="text-xs text-warning">Pending</p>
                        <p className="font-bold text-sm text-warning">{stats.pending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Enrollments */}
        <TabsContent value="enrollments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Applications</p>
              <p className="text-3xl font-bold mt-1">{totalAll}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase font-medium">Enrolled</p>
              <p className="text-3xl font-bold mt-1 text-success">{totalEnrolled}</p>
              <p className="text-[10px] text-muted-foreground">{totalAll > 0 ? Math.round((totalEnrolled/totalAll)*100) : 0}% conversion</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase font-medium">Pending Review</p>
              <p className="text-3xl font-bold mt-1 text-warning">{totalPending}</p>
            </CardContent></Card>
          </div>

          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
              <CardDescription>Enrollment activity over last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="total" name="Applications" radius={[4,4,0,0]} barSize={32} fill="hsl(var(--primary))" opacity={0.35} />
                    <Bar dataKey="enrolled" name="Enrolled" radius={[4,4,0,0]} barSize={32} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }: any) {
  const colorMap: any = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-3">
        <div className={cn('p-2.5 rounded-xl shrink-0', colorMap[color])}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase font-medium">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickList({ title, items, icon }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-40 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">None assigned</p>
        ) : items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/40">
            <span className="font-medium truncate">{item.name}</span>
            <span className="text-muted-foreground shrink-0 ml-2">{item.code}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ResourceGrid({ items, type }: { items: any[]; type: string }) {
  const icons: any = {
    university: <Building2 className="w-4 h-4" />,
    program: <BookOpen className="w-4 h-4" />,
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.length === 0 ? (
        <p className="text-muted-foreground col-span-3 text-center py-8">No {type}s assigned to your sub-department</p>
      ) : items.map((item: any) => (
        <Card key={item.id} className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icons[type]}</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.code}</p>
              {item.duration && <p className="text-[10px] text-muted-foreground mt-0.5">{item.duration}</p>}
              <Badge variant="outline" className={cn('text-[9px] mt-1 uppercase', item.status === 'active' ? 'text-success border-success/30' : 'text-muted-foreground')}>
                {item.status || 'active'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
