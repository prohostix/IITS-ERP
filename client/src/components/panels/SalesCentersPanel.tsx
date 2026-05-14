import { useState, useEffect } from 'react';
import { Building2, GraduationCap, RefreshCw, ChevronRight, ArrowLeft, BookOpen, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const statusColor: Record<string, string> = {
  pending_verification: 'bg-yellow-500/10 text-yellow-600 border-yellow-400/30',
  ops_verified: 'bg-blue-500/10 text-blue-600 border-blue-400/30',
  pending_payment: 'bg-orange-500/10 text-orange-600 border-orange-400/30',
  active: 'bg-green-500/10 text-green-600 border-green-400/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
  inactive: 'bg-muted text-muted-foreground',
};

const enrollStatusColor: Record<string, string> = {
  payment_pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-400/30',
  document_review: 'bg-blue-500/10 text-blue-600 border-blue-400/30',
  finance_review: 'bg-orange-500/10 text-orange-600 border-orange-400/30',
  enrolled: 'bg-green-500/10 text-green-600 border-green-400/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
  department_rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
};

function CenterDetailView({ centerId, onBack }: { centerId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get(`/sales/my-centers/${centerId}`)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [centerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <p className="text-muted-foreground text-center py-12">Failed to load center details.</p>
      </div>
    );
  }

  const { center, enrollments, byProgram, stats } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{center.name}</h2>
            <span className="text-sm text-muted-foreground">({center.code})</span>
            <Badge variant="outline" className={cn('text-[10px] uppercase', statusColor[center.status] || '')}>
              {center.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {center.email}{center.city ? ` · ${center.city}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: stats.totalStudents, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Enrolled', value: stats.enrolled, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-500/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', s.bg)}>
                <Users className={cn('w-4 h-4', s.color)} />
              </div>
              <div>
                <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs ({byProgram.length})</TabsTrigger>
          <TabsTrigger value="students">All Students ({enrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Associated Universities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!center.associatedUniversityIds?.length ? (
                <p className="text-sm text-muted-foreground">No universities assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {center.associatedUniversityIds.map((u: any) => (
                    <Badge key={u.id} variant="secondary" className="text-xs">
                      {u.name}{u.code ? ` (${u.code})` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Allowed Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!center.allowedProgramIds?.length ? (
                <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {center.allowedProgramIds.map((p: any) => {
                    const group = byProgram.find((b: any) => b.program?.id?.toString() === p.id?.toString());
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.code}{p.duration ? ` · ${p.duration}` : ''}{p.level ? ` · ${p.level}` : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {group?.students?.length || 0} students
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="mt-4 space-y-4">
          {byProgram.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No enrollments yet</p>
              </CardContent>
            </Card>
          ) : byProgram.map((group: any) => (
            <Card key={group.program?.id || 'unknown'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{group.program?.name || 'Unknown Program'}</CardTitle>
                  <Badge variant="secondary">{group.students.length} students</Badge>
                </div>
                {group.program?.code && (
                  <CardDescription className="text-[10px]">
                    {group.program.code}{group.program.level ? ` · ${group.program.level}` : ''}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {group.students.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{s.studentName}</p>
                      <p className="text-[10px] text-muted-foreground">{s.studentEmail} · {s.enrollmentNumber}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] uppercase', enrollStatusColor[s.status] || '')}>
                      {s.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {enrollments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No students enrolled yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {(e.studentName || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{e.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {e.studentEmail} · {e.programId?.name || 'Program'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{e.enrollmentNumber}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <Badge variant="outline" className={cn('text-[10px] uppercase', enrollStatusColor[e.status] || '')}>
                          {e.status?.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SalesCentersPanel() {
  const [centers, setCenters] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('centers');
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [centersRes, admissionsRes] = await Promise.all([
        api.get('/sales/my-centers'),
        api.get('/sales/my-centers/admissions'),
      ]);
      setCenters(centersRes.data.data || []);
      setAdmissions(admissionsRes.data.data || []);
    } catch {
      setCenters([]);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (selectedCenterId) {
    return <CenterDetailView centerId={selectedCenterId} onBack={() => setSelectedCenterId(null)} />;
  }

  const activeCount = centers.filter(c => c.status === 'active').length;
  const pendingCount = centers.filter(c => c.status === 'pending_verification').length;
  const enrolledCount = admissions.filter(a => a.status === 'enrolled').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Study Centers</h2>
          <p className="text-sm text-muted-foreground">Centers onboarded via your invite links and your team's links</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Building2 className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Centers</p>
              <p className="text-2xl font-bold">{loading ? '...' : centers.length}</p>
              <p className="text-[10px] text-muted-foreground">{activeCount} active · {pendingCount} pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-600"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Admissions</p>
              <p className="text-2xl font-bold">{loading ? '...' : admissions.length}</p>
              <p className="text-[10px] text-muted-foreground">{enrolledCount} enrolled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-600"><ChevronRight className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Pending Review</p>
              <p className="text-2xl font-bold">
                {loading ? '...' : admissions.filter(a => ['payment_pending', 'document_review', 'finance_review'].includes(a.status)).length}
              </p>
              <p className="text-[10px] text-muted-foreground">awaiting processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="centers">Study Centers ({centers.length})</TabsTrigger>
          <TabsTrigger value="admissions">Admissions ({admissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="centers" className="mt-4">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Onboarded Centers</CardTitle>
              <CardDescription>Study centers registered through your invite links or your team's links</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
                </div>
              ) : centers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No centers yet</p>
                  <p className="text-sm mt-1">Share invite links to onboard study centers.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {centers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCenterId(c.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{c.name}</p>
                          <span className="text-xs text-muted-foreground">({c.code})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.email}{c.city ? ` · ${c.city}` : ''}
                        </p>
                        {c.associatedUniversityIds?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {c.associatedUniversityIds.map((u: any) => u.name || u).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <Badge variant="outline" className={cn('text-[10px] uppercase', statusColor[c.status] || '')}>
                          {c.status?.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admissions" className="mt-4">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Admissions</CardTitle>
              <CardDescription>Student enrollments from your onboarded centers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
                </div>
              ) : admissions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No admissions yet</p>
                  <p className="text-sm mt-1">Admissions from your centers will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {admissions.map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">
                        {(a.studentName || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{a.studentName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.programId?.name || 'Program'} · {a.studyCenterId?.name || 'Center'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{a.enrollmentNumber}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <Badge variant="outline" className={cn('text-[10px] uppercase', enrollStatusColor[a.status] || '')}>
                          {a.status?.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
