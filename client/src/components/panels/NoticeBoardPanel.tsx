import { useState, useEffect } from 'react';
import { Megaphone, CalendarDays, BarChart2, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  hr: 'bg-purple-100 text-purple-800',
  ops: 'bg-orange-100 text-orange-800',
  finance: 'bg-emerald-100 text-emerald-800',
  sales: 'bg-cyan-100 text-cyan-800',
};

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  national: 'bg-blue-100 text-blue-800',
  regional: 'bg-purple-100 text-purple-800',
  company: 'bg-green-100 text-green-800',
};

export function NoticeBoardPanel() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Record<string, number[]>>({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, hRes, pRes] = await Promise.all([
        api.get('/hr/announcements'),
        api.get('/hr/holidays'),
        api.get('/hr/polls'),
      ]);
      setAnnouncements(aRes.data.data || []);
      setHolidays(hRes.data.data || []);
      setPolls((pRes.data.data || []).filter((p: any) => p.isActive));
    } catch { toast.error('Failed to load notice board'); }
    finally { setLoading(false); }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    const current = votedPolls[pollId] || [];
    let newIndexes: number[];
    if (poll.allowMultiple) {
      newIndexes = current.includes(optionIndex)
        ? current.filter((i: number) => i !== optionIndex)
        : [...current, optionIndex];
    } else {
      newIndexes = [optionIndex];
    }
    try {
      await api.post(`/hr/polls/${pollId}/vote`, { optionIndexes: newIndexes });
      setVotedPolls(prev => ({ ...prev, [pollId]: newIndexes }));
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to vote');
    }
  };

  const totalVotes = (poll: any) => poll.options.reduce((s: number, o: any) => s + o.votes.length, 0);
  const pct = (votes: number, total: number) => total === 0 ? 0 : Math.round((votes / total) * 100);
  const hasVoted = (poll: any) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.some((o: any) => o.votes.includes(uid));
  };
  const myVotes = (poll: any) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.map((o: any, i: number) => o.votes.includes(uid) ? i : -1).filter((i: number) => i >= 0);
  };

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notice Board</h2>
          <p className="text-muted-foreground text-sm">Announcements, holidays, and polls from HR</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="announcements">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="w-4 h-4 mr-1.5" />
            Announcements {announcements.length > 0 && `(${announcements.length})`}
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Holidays {upcomingHolidays.length > 0 && `(${upcomingHolidays.length})`}
          </TabsTrigger>
          <TabsTrigger value="polls">
            <BarChart2 className="w-4 h-4 mr-1.5" />
            Polls {polls.length > 0 && `(${polls.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Announcements */}
        <TabsContent value="announcements" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : announcements.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No announcements</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <Card key={a.id} className={a.priority === 'high' ? 'border-red-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={`text-xs ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge>
                          <Badge className={`text-xs ${PRIORITY_COLORS[a.priority] || ''}`}>{a.priority}</Badge>
                          {a.postedBy?.name && <span className="text-xs text-muted-foreground">— {a.postedBy.name}</span>}
                          <span className="text-xs text-muted-foreground">{new Date(a.postedAt || a.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : holidays.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No holidays published yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {/* Upcoming */}
              {upcomingHolidays.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Upcoming</p>
                  <div className="space-y-2">
                    {upcomingHolidays.map(h => {
                      const d = new Date(h.date);
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <Card key={h.id} className={isToday ? 'border-primary' : ''}>
                          <CardContent className="p-3 flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg shrink-0">
                              <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                              <span className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{h.name}</p>
                              <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <Badge className={`text-xs ${HOLIDAY_TYPE_COLORS[h.type] || ''}`}>{h.type}</Badge>
                            {isToday && <Badge className="text-xs bg-primary text-primary-foreground">Today</Badge>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Past */}
              {holidays.filter(h => new Date(h.date) < new Date()).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2 mt-4">Past</p>
                  <div className="space-y-2 opacity-60">
                    {holidays.filter(h => new Date(h.date) < new Date()).map(h => {
                      const d = new Date(h.date);
                      return (
                        <div key={h.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-lg shrink-0">
                            <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                            <span className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{h.type}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls" className="mt-4">
          {loading ? (
            <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : polls.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No active polls</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {polls.map(poll => {
                const total = totalVotes(poll);
                const voted = hasVoted(poll);
                const myVoteIdxs = myVotes(poll);
                const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                const canVote = !expired;

                return (
                  <Card key={poll.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{poll.question}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {poll.allowMultiple && <Badge variant="outline" className="text-xs">Multi-choice</Badge>}
                        {poll.expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(poll.expiresAt).toLocaleDateString()}</span>}
                        <span className="text-xs text-muted-foreground">{total} vote{total !== 1 ? 's' : ''}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {poll.options.map((opt: any, idx: number) => {
                        const isMyVote = myVoteIdxs.includes(idx);
                        const optPct = pct(opt.votes.length, total);
                        return (
                          <button
                            key={idx}
                            className={`w-full text-left p-3 rounded-lg border transition-colors relative overflow-hidden ${
                              isMyVote ? 'border-primary bg-primary/5' : canVote && !voted ? 'hover:border-primary/50 hover:bg-muted/50' : 'cursor-default'
                            }`}
                            onClick={() => canVote ? handleVote(poll.id, idx) : undefined}
                          >
                            {(voted || !canVote) && (
                              <div className="absolute inset-0 bg-primary/10 rounded-lg" style={{ width: `${optPct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isMyVote && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                                <span className="text-sm font-medium">{opt.text}</span>
                              </div>
                              {(voted || !canVote) && (
                                <span className="text-xs font-semibold text-muted-foreground">{optPct}% ({opt.votes.length})</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {canVote && !voted && <p className="text-xs text-muted-foreground pt-1">Click an option to vote</p>}
                      {voted && <p className="text-xs text-primary pt-1">You voted — click another option to change</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
