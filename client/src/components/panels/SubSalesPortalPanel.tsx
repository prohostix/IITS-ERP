import { useState, useEffect } from 'react';
import {
  Link, Plus, Copy, Check, RefreshCw, Building2, MapPin,
  GraduationCap, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-success/10 text-success',
  used: 'bg-muted text-muted-foreground',
  expired: 'bg-error/10 text-error',
};

export function SubSalesPortalPanel() {
  const [subDeptData, setSubDeptData] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sdRes, invRes] = await Promise.all([
        api.get('/sub-departments/my'),
        api.get('/sales/invites').catch(() => ({ data: { data: [] } })),
      ]);
      setSubDeptData(sdRes.data.data);
      setInvites(invRes.data.data || []);
    } catch {
      setSubDeptData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleUniversity = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleGenerate = async () => {
    if (selected.length === 0) { toast.error('Select at least one university'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/sales/invites', { universityIds: selected });
      toast.success('Invite link generated');
      setOpen(false);
      setSelected([]);
      const url = res.data.data?.inviteUrl;
      if (url) { navigator.clipboard.writeText(url).catch(() => {}); toast.info('Link copied to clipboard'); }
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate invite');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (invite: any) => {
    const url = invite.inviteUrl || `${window.location.origin}/register?token=${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(invite.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
      </div>
    );
  }

  if (!subDeptData) {
    return (
      <Card><CardContent className="py-16 text-center text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No sub-department assigned to your account.</p>
      </CardContent></Card>
    );
  }

  const { subDepartment: sd, enrollmentStats, monthlyEnrollments } = subDeptData;
  const universities: any[] = sd.assignedUniversities || [];
  const centers: any[] = sd.assignedCenters || [];

  const totalEnrolled = enrollmentStats.reduce((s: number, e: any) => s + (e.enrolled || 0), 0);
  const totalPending = enrollmentStats.reduce((s: number, e: any) => s + (e.pending || 0), 0);
  const totalAll = enrollmentStats.reduce((s: number, e: any) => s + (e.total || 0), 0);

  const centerEnrollMap: Record<string, any> = {};
  enrollmentStats.forEach((e: any) => { centerEnrollMap[e.id?.toString()] = e; });

  const chartData = monthlyEnrollments.map((m: any) => ({
    month: MONTH_NAMES[m.id.month - 1],
    total: m.total,
    enrolled: m.enrolled,
  }));

  const activeInvites = invites.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{sd.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Sales Sub-Department Portal</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Building2 className="w-5 h-5" />} label="Universities" value={universities.length} color="primary" />
        <StatCard icon={<MapPin className="w-5 h-5" />} label="Study Centers" value={centers.length} color="info" />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Enrolled" value={totalEnrolled} color="success" sub={`${totalPending} pending`} />
        <StatCard icon={<Link className="w-5 h-5" />} label="Active Invites" value={activeInvites.length} color="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invite_links">Invite Links</TabsTrigger>
          <TabsTrigger value="universities">Universities ({universities.length})</TabsTrigger>
          <TabsTrigger value="centers">Study Centers ({centers.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly chart */}
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Monthly Enrollments</CardTitle>
                <CardDescription>Last 6 months from your assigned centers</CardDescription>
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
                      <Bar dataKey="total" name="Applications" radius={[4,4,0,0]} barSize={28} fill="hsl(var(--primary))" opacity={0.35} />
                      <Bar dataKey="enrolled" name="Enrolled" radius={[4,4,0,0]} barSize={28} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent invites */}
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Recent Invite Links</CardTitle>
                  <CardDescription>Links you've generated</CardDescription>
                </div>
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />New
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No invite links yet</p>
                ) : invites.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[9px] uppercase', STATUS_COLOR[inv.status])}>{inv.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">Exp: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{inv.token.substring(0, 20)}...</p>
                    </div>
                    {inv.status === 'pending' && (
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyLink(inv)}>
                        {copied === inv.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Universities + Centers quick view */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />Assigned Universities</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 max-h-40 overflow-y-auto">
                {universities.length === 0 ? <p className="text-xs text-muted-foreground">None assigned</p> :
                  universities.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/40">
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{u.code}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Assigned Study Centers</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 max-h-40 overflow-y-auto">
                {centers.length === 0 ? <p className="text-xs text-muted-foreground">None assigned</p> :
                  centers.map((c: any) => {
                    const stats = centerEnrollMap[c.id?.toString()] || { enrolled: 0, total: 0 };
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/40">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{stats.enrolled} enrolled</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invite Links */}
        <TabsContent value="invite_links">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Generate Invite Link
              </Button>
            </div>
            {invites.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Link className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No invite links yet. Generate one to get started.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {invites.map(inv => (
                  <Card key={inv.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[inv.status])}>{inv.status}</Badge>
                          <span className="text-xs text-muted-foreground">Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-mono text-muted-foreground truncate">{inv.token.substring(0, 28)}...</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(inv.universityIds || []).map((u: any) => (
                            <Badge key={u.id || u} variant="outline" className="text-[10px]">{u.name || u}</Badge>
                          ))}
                        </div>
                      </div>
                      {inv.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => copyLink(inv)}>
                          {copied === inv.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Universities */}
        <TabsContent value="universities">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universities.length === 0 ? (
              <p className="text-muted-foreground col-span-3 text-center py-8">No universities assigned to your sub-department</p>
            ) : universities.map((u: any) => (
              <Card key={u.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><Building2 className="w-4 h-4" /></div>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.code}</p>
                    <Badge variant="outline" className={cn('text-[9px] mt-1 uppercase', u.status === 'active' ? 'text-success border-success/30' : 'text-muted-foreground')}>
                      {u.status || 'active'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <p className="text-xs text-muted-foreground uppercase font-medium">Pending</p>
              <p className="text-3xl font-bold mt-1 text-warning">{totalPending}</p>
            </CardContent></Card>
          </div>
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Monthly Enrollment Trend</CardTitle>
              <CardDescription>Applications vs enrolled — last 6 months</CardDescription>
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

      {/* Generate invite dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Invite Link</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Select Universities (assigned to your sub-department)</Label>
            {universities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No universities assigned to your sub-department.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {universities.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox id={u.id} checked={selected.includes(u.id)} onCheckedChange={() => toggleUniversity(u.id)} />
                    <label htmlFor={u.id} className="text-sm cursor-pointer flex-1">
                      {u.name} <span className="text-muted-foreground text-xs">({u.code})</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSelected([]); }}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={submitting || selected.length === 0}>
              {submitting ? 'Generating...' : 'Generate & Copy Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
