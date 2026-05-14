import { useState, useEffect } from 'react';
import { Users, TrendingUp, Target, RefreshCw, Trophy, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

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
}

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

  const fetch = async () => {
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

  useEffect(() => { fetch(); }, []);

  const totalLeads = team.reduce((s, m) => s + m.leads, 0);
  const totalConverted = team.reduce((s, m) => s + m.converted, 0);
  const avgScore = team.length ? Math.round(team.reduce((s, m) => s + m.score, 0) / team.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">My Team</h2>
          <p className="text-sm text-muted-foreground">Sales performance &amp; lead stats for your team</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Team Size</p>
              <p className="text-2xl font-bold">{loading ? '...' : team.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Leads</p>
              <p className="text-2xl font-bold">{loading ? '...' : totalLeads}</p>
              <p className="text-[10px] text-muted-foreground">{totalConverted} converted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Avg Performance</p>
              <p className={cn('text-2xl font-bold', scoreColor(avgScore))}>{loading ? '...' : `${avgScore}%`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team leaderboard */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Team Leaderboard</CardTitle>
          <CardDescription>Ranked by combined conversion rate &amp; target progress</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : team.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No teammates found</p>
              <p className="text-sm mt-1">Team members in your department will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.map((member, i) => (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border transition-all',
                    i === 0 ? 'border-yellow-500/30 bg-yellow-500/5' :
                    i === 1 ? 'border-slate-400/30 bg-slate-400/5' :
                    i === 2 ? 'border-amber-600/30 bg-amber-600/5' :
                    'border-border bg-muted/20'
                  )}
                >
                  {/* Rank */}
                  <div className="w-6 flex justify-center shrink-0">{rankIcon(i)}</div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {member.name[0].toUpperCase()}
                  </div>

                  {/* Name + designation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{member.name}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] uppercase shrink-0',
                          member.status === 'active' ? 'border-success/40 text-success' : 'border-muted text-muted-foreground'
                        )}
                      >
                        {member.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{member.designation}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="font-bold text-sm">{member.leads}</p>
                      <p className="text-[10px] text-success">{member.converted} conv.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Conv. Rate</p>
                      <p className="font-bold text-sm">{member.conversionRate}%</p>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <p className="text-xs text-muted-foreground">Target</p>
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, member.targetProgress)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{member.targetProgress}%</p>
                    </div>
                  </div>

                  {/* Score badge */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                    <p className={cn('text-lg font-bold', scoreColor(member.score))}>{member.score}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
