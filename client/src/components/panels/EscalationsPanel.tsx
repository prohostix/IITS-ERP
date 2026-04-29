import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Escalation {
  id: string;
  taskId?: { id: string; title: string; description: string; deadline: string; priority: string };
  employeeId?: { id: string; name: string; email: string };
  deptAdminId?: { id: string; name: string; email: string };
  organizationId: string;
  priority: string;
  status: string;
  escalatedAt: string;
  resolution?: string;
  resolvedAt?: string;
  chain?: { level: string; action: string; timestamp: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-warning/10 text-warning',
  resolved:   'bg-success/10 text-success',
  reassigned: 'bg-info/10 text-info',
  extended:   'bg-primary/10 text-primary',
  justified:  'bg-muted text-muted-foreground',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500',
  high:     'bg-orange-500/10 text-orange-500',
  medium:   'bg-yellow-500/10 text-yellow-500',
  low:      'bg-blue-500/10 text-blue-500',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function EscalationsPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionData, setActionData] = useState({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/escalations');
      setEscalations(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEscalations(); }, []);

  const filtered = escalations.filter(e =>
    activeTab === 'all' ? true : e.status === activeTab
  );

  const handleAction = async () => {
    if (!selected || !actionData.action) return;
    setSubmitting(true);
    try {
      await api.patch(`/ceo/escalations/${selected.id}`, actionData);
      toast.success('Escalation handled successfully');
      setActionDialog(false);
      setSelected(null);
      setActionData({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
      fetchEscalations();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to handle escalation');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (esc: Escalation) => {
    setSelected(esc);
    setActionData({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
    setActionDialog(true);
  };

  const counts = {
    all:      escalations.length,
    pending:  escalations.filter(e => e.status === 'pending').length,
    resolved: escalations.filter(e => e.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Escalations</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and resolve escalated tasks from departments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEscalations} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{counts.pending}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{counts.resolved}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{counts.all}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No escalations found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(esc => (
                <Card key={esc.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[esc.status] || 'bg-muted text-muted-foreground')}>
                            {esc.status}
                          </Badge>
                          <Badge className={cn('text-[10px] uppercase font-bold', PRIORITY_COLOR[esc.priority] || 'bg-muted text-muted-foreground')}>
                            {esc.priority}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(esc.escalatedAt)}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{esc.taskId?.title || 'Task Escalation'}</h4>
                        {esc.taskId?.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{esc.taskId.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {esc.employeeId && <span>Employee: {esc.employeeId.name}</span>}
                          {esc.deptAdminId && <span>Dept Admin: {esc.deptAdminId.name}</span>}
                          {esc.taskId?.deadline && <span>Deadline: {new Date(esc.taskId.deadline).toLocaleDateString()}</span>}
                        </div>
                        {esc.resolution && (
                          <p className="text-xs text-success mt-2">Resolution: {esc.resolution}</p>
                        )}
                      </div>
                      {esc.status === 'pending' && (
                        <Button size="sm" onClick={() => openAction(esc)}>Take Action</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Handle Escalation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Task</Label>
              <p className="text-sm text-muted-foreground mt-1">{selected?.taskId?.title || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionData.action} onValueChange={v => setActionData(d => ({ ...d, action: v }))}>
                <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolve">Resolve</SelectItem>
                  <SelectItem value="reassign">Reassign</SelectItem>
                  <SelectItem value="extend">Extend Deadline</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actionData.action === 'reassign' && (
              <div className="space-y-2">
                <Label>Reassign To (User ID)</Label>
                <Input value={actionData.reassignTo} onChange={e => setActionData(d => ({ ...d, reassignTo: e.target.value }))} placeholder="User ID..." />
              </div>
            )}
            {actionData.action === 'extend' && (
              <div className="space-y-2">
                <Label>New Deadline</Label>
                <Input type="date" value={actionData.newDeadline} onChange={e => setActionData(d => ({ ...d, newDeadline: e.target.value }))} />
              </div>
            )}
            {['resolve', 'justify'].includes(actionData.action) && (
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea value={actionData.resolution} onChange={e => setActionData(d => ({ ...d, resolution: e.target.value }))} placeholder="Describe the resolution..." rows={3} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAction} disabled={!actionData.action || submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button variant="outline" onClick={() => setActionDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
