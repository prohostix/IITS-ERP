import { useState, useEffect } from 'react';
import { Users, Building2, AlertTriangle, RefreshCw, Trophy, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface EmployeePerf {
  userId: string;
  name: string;
  email: string;
  role: string;
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  score: number;
}

interface DeptEfficiency {
  departmentId: string;
  name: string;
  type: string;
  memberCount: number;
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  overdueRate: number;
  efficiency: number;
}

// SVG Arc Gauge — semicircle, 0–100 scale
function GaugeMeter({ value, size = 160 }: { value: number; size?: number }) {
  const clamp = Math.max(0, Math.min(100, value));
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.58;
  const startAngle = Math.PI; // 180°
  const endAngle = 0;         // 0°

  // Arc path helper
  const polarToXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  // Background arc (full semicircle)
  const bgStart = polarToXY(startAngle, r);
  const bgEnd = polarToXY(endAngle, r);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Filled arc (value portion)
  const fillAngle = startAngle - (clamp / 100) * Math.PI;
  const fillEnd = polarToXY(fillAngle, r);
  const largeArc = clamp > 50 ? 1 : 0;
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  // Color zones
  const gaugeColor = clamp >= 67 ? '#22c55e' : clamp >= 34 ? '#f59e0b' : '#ef4444';
  const trackColor = 'hsl(var(--muted))';

  // Needle
  const needleAngle = startAngle - (clamp / 100) * Math.PI;
  const needleLen = r * 0.85;
  const needleTip = polarToXY(needleAngle, needleLen);
  const needleBase1 = polarToXY(needleAngle + Math.PI / 2, 4);
  const needleBase2 = polarToXY(needleAngle - Math.PI / 2, 4);

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {/* Zone ticks */}
      {[0, 33, 67, 100].map((tick) => {
        const a = startAngle - (tick / 100) * Math.PI;
        const inner = polarToXY(a, r - 8);
        const outer = polarToXY(a, r + 2);
        return <line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="hsl(var(--border))" strokeWidth={1.5} />;
      })}
      {/* Track */}
      <path d={bgPath} fill="none" stroke={trackColor} strokeWidth={14} strokeLinecap="round" />
      {/* Red zone 0–33 */}
      {(() => {
        const zEnd = polarToXY(startAngle - 0.33 * Math.PI, r);
        return <path d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${zEnd.x} ${zEnd.y}`} fill="none" stroke="#ef444430" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Yellow zone 33–67 */}
      {(() => {
        const zStart = polarToXY(startAngle - 0.33 * Math.PI, r);
        const zEnd = polarToXY(startAngle - 0.67 * Math.PI, r);
        return <path d={`M ${zStart.x} ${zStart.y} A ${r} ${r} 0 0 1 ${zEnd.x} ${zEnd.y}`} fill="none" stroke="#f59e0b30" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Green zone 67–100 */}
      {(() => {
        const zStart = polarToXY(startAngle - 0.67 * Math.PI, r);
        return <path d={`M ${zStart.x} ${zStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`} fill="none" stroke="#22c55e30" strokeWidth={14} strokeLinecap="round" />;
      })()}
      {/* Value fill */}
      {clamp > 0 && (
        <path d={fillPath} fill="none" stroke={gaugeColor} strokeWidth={14} strokeLinecap="round" />
      )}
      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={gaugeColor}
        opacity={0.9}
      />
      <circle cx={cx} cy={cy} r={5} fill={gaugeColor} />
      {/* Labels */}
      <text x={cx - r - 4} y={cy + 14} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">1</text>
      <text x={cx + r + 4} y={cy + 14} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">100</text>
      {/* Value */}
      <text x={cx} y={cy - 6} fontSize={22} fontWeight="bold" fill={gaugeColor} textAnchor="middle">{clamp}</text>
      <text x={cx} y={cy + 10} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">efficiency</text>
    </svg>
  );
}

function ScoreBar({ value, max = 100, color = 'bg-primary' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold min-w-[32px] text-right">{value}%</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-primary/10 text-primary text-[10px] font-bold">Good</Badge>;
  if (score >= 40) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold">Average</Badge>;
  return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">Needs Attention</Badge>;
}

// Returns card color classes based on score
function empCardClasses(score: number) {
  if (score >= 70) return 'border-green-400/50 bg-green-50/60 dark:bg-green-950/30';
  if (score >= 40) return 'border-yellow-400/50 bg-yellow-50/60 dark:bg-yellow-950/30';
  return 'border-red-400/50 bg-red-50/60 dark:bg-red-950/30';
}

export function PerformancePanel() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [departments, setDepartments] = useState<DeptEfficiency[]>([]);
  const [tab, setTab] = useState('departments');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/analytics');
      setEmployees(res.data.data.employeePerformance || []);
      setDepartments(res.data.data.departmentEfficiency || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const avgDeptEfficiency = departments.length
    ? Math.round(departments.reduce((s, d) => s + d.efficiency, 0) / departments.length)
    : 0;
  const topEmployee = employees[0];
  const overdueEmployees = employees.filter(e => e.overdue > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">Employee productivity and department efficiency across the organisation.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Building2 className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{avgDeptEfficiency}%</p>
              <p className="text-xs text-muted-foreground">Avg Dept Efficiency</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-xs text-muted-foreground">Active Contributors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-600"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{overdueEmployees}</p>
              <p className="text-xs text-muted-foreground">With Overdue Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-600"><Trophy className="w-5 h-5" /></div>
            <div>
              <p className="text-lg font-bold truncate max-w-[100px]">{topEmployee?.name?.split(' ')[0] || '—'}</p>
              <p className="text-xs text-muted-foreground">Top Performer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="departments">Department Efficiency</TabsTrigger>
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
        </TabsList>

        {/* Department Efficiency — Gauge Meters */}
        <TabsContent value="departments" className="space-y-6 mt-4">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-52 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : departments.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No department data yet</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {departments.map((dept) => {
                const eff = dept.efficiency;
                const borderColor = eff >= 67 ? 'border-green-400/40' : eff >= 34 ? 'border-yellow-400/40' : 'border-red-400/40';
                const bgColor = eff >= 67 ? 'bg-green-50/40 dark:bg-green-950/20' : eff >= 34 ? 'bg-yellow-50/40 dark:bg-yellow-950/20' : 'bg-red-50/40 dark:bg-red-950/20';
                return (
                  <Card key={dept.departmentId} className={cn('transition-all hover:shadow-lg', borderColor, bgColor)}>
                    <CardContent className="p-4 flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-1 self-start">
                        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm font-bold">{dept.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider self-start mb-2">
                        {dept.type} · {dept.memberCount} members
                      </p>
                      <GaugeMeter value={eff} size={150} />
                      <ScoreBadge score={eff} />
                      <div className="grid grid-cols-3 gap-1 mt-3 w-full text-center">
                        <div className="bg-muted/50 rounded-lg p-1.5">
                          <p className="text-xs font-bold">{dept.total}</p>
                          <p className="text-[9px] text-muted-foreground">Total</p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-1.5">
                          <p className="text-xs font-bold text-green-600 dark:text-green-400">{dept.completed}</p>
                          <p className="text-[9px] text-muted-foreground">Done</p>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-1.5">
                          <p className="text-xs font-bold text-red-600 dark:text-red-400">{dept.overdue}</p>
                          <p className="text-[9px] text-muted-foreground">Overdue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Employee Performance — color-coded cards */}
        <TabsContent value="employees" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : employees.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No employee task data yet</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radial chart for top 5 */}
              <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base">Top Performers</CardTitle>
                  <CardDescription>Completion rate — top 5 employees</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="20%"
                      outerRadius="90%"
                      data={employees.slice(0, 5).map((e, i) => ({
                        name: e.name.split(' ')[0],
                        value: e.completionRate,
                        fill: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'][i],
                      }))}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar dataKey="value" cornerRadius={4} label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px' }}
                        formatter={(v: any) => [`${v}%`, 'Completion']}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Employee list — color-coded by score */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {employees.map((emp, idx) => (
                  <Card key={emp.userId} className={cn('transition-colors border', empCardClasses(emp.score))}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-muted text-muted-foreground'
                          )}>
                            {idx === 0 ? <Trophy className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{emp.role?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <ScoreBadge score={emp.score} />
                      </div>
                      <ScoreBar
                        value={emp.completionRate}
                        color={emp.score >= 70 ? 'bg-green-500' : emp.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
                      />
                      <div className="grid grid-cols-4 gap-1 mt-2 text-center">
                        <div>
                          <p className="text-xs font-bold">{emp.total}</p>
                          <p className="text-[9px] text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-green-600 dark:text-green-400">{emp.completed}</p>
                          <p className="text-[9px] text-muted-foreground">Done</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-500">{emp.inProgress}</p>
                          <p className="text-[9px] text-muted-foreground">Active</p>
                        </div>
                        <div>
                          <p className={cn('text-xs font-bold', emp.overdue > 0 ? 'text-red-500' : 'text-muted-foreground')}>{emp.overdue}</p>
                          <p className="text-[9px] text-muted-foreground">Overdue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
