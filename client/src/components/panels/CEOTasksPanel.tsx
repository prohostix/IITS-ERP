import { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, ListTodo, Filter, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo?: { id: string; name: string; email: string };
  assignedBy?: { id: string; name: string; email: string };
  departmentId?: { id: string; name: string };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  deadline: string;
  completedAt?: string;
  remarks?: string;
  escalationStatus?: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  departmentId?: { id: string; name: string };
}

const emptyForm = {
  title: '',
  description: '',
  assignedTo: '',
  departmentId: '',
  priority: 'medium',
  deadline: '',
};

const STATUS_STYLES: Record<string, string> = {
  completed:   'bg-success/10 text-success border-success/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  pending:     'bg-muted text-muted-foreground border-border',
  overdue:     'bg-destructive/10 text-destructive border-destructive/20',
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500',
  high:     'bg-orange-500/10 text-orange-500',
  medium:   'bg-yellow-500/10 text-yellow-500',
  low:      'bg-blue-500/10 text-blue-500',
};

const ESCALATION_STYLES: Record<string, string> = {
  escalated_ceo:  'bg-red-500/10 text-red-500',
  escalated_dept: 'bg-orange-500/10 text-orange-500',
  overdue_employee: 'bg-yellow-500/10 text-yellow-500',
};

function isOverdue(deadline: string, status: string) {
  return status !== 'completed' && new Date(deadline) < new Date();
}

export function CEOTasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (deptFilter !== 'all') params.departmentId = deptFilter;

      const res = await api.get('/tasks', { params });
      setTasks(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch {}
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/ceo/managers');
      setManagers(res.data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, deptFilter]);

  const filtered = tasks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.assignedTo?.name?.toLowerCase().includes(q) ||
      t.departmentId?.name?.toLowerCase().includes(q)
    );
  });

  const handleAssign = async () => {
    if (!form.title || !form.assignedTo || !form.departmentId || !form.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ceo/tasks', form);
      toast.success('Task assigned successfully');
      setAssignDialog(false);
      setForm(emptyForm);
      fetchTasks();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  // When manager is selected, auto-fill their department
  const handleManagerChange = (managerId: string) => {
    const mgr = managers.find(m => m.id === managerId);
    setForm(f => ({
      ...f,
      assignedTo: managerId,
      departmentId: mgr?.departmentId?.id || f.departmentId,
    }));
  };

  // Summary counts
  const counts = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue' || isOverdue(t.deadline, t.status)).length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organisation Tasks</h2>
          <p className="text-muted-foreground text-sm mt-1">Complete task list across all departments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAssignDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Task
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: <ListTodo className="w-4 h-4" />, color: 'bg-muted text-foreground' },
          { label: 'Completed', value: counts.completed, icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-success/10 text-success' },
          { label: 'In Progress', value: counts.inProgress, icon: <Clock className="w-4 h-4" />, color: 'bg-primary/10 text-primary' },
          { label: 'Pending', value: counts.pending, icon: <Clock className="w-4 h-4" />, color: 'bg-muted text-muted-foreground' },
          { label: 'Overdue', value: counts.overdue, icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-destructive/10 text-destructive' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, assignees, departments..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || priorityFilter !== 'all' || deptFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setDeptFilter('all'); setSearch(''); }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            {search || statusFilter !== 'all' || priorityFilter !== 'all' || deptFilter !== 'all' ? ' (filtered)' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-px">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-20 bg-muted/50 animate-pulse mx-4 mb-2 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(task => {
                const actuallyOverdue = isOverdue(task.deadline, task.status);
                const displayStatus = actuallyOverdue && task.status !== 'completed' ? 'overdue' : task.status;

                return (
                  <div key={task.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-sm">{task.title}</span>
                          <Badge className={cn('text-[10px] font-bold uppercase border', STATUS_STYLES[displayStatus])}>
                            {displayStatus.replace('_', ' ')}
                          </Badge>
                          <Badge className={cn('text-[10px] font-bold uppercase', PRIORITY_STYLES[task.priority])}>
                            {task.priority}
                          </Badge>
                          {task.escalationStatus && task.escalationStatus !== 'none' && (
                            <Badge className={cn('text-[10px] font-bold uppercase', ESCALATION_STYLES[task.escalationStatus] || 'bg-muted text-muted-foreground')}>
                              {task.escalationStatus.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            <span className="font-medium text-foreground/70">Assigned to:</span>{' '}
                            {task.assignedTo?.name || '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground/70">By:</span>{' '}
                            {task.assignedBy?.name || '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground/70">Dept:</span>{' '}
                            {task.departmentId?.name || '—'}
                          </span>
                          <span className={cn(actuallyOverdue && task.status !== 'completed' ? 'text-destructive font-semibold' : '')}>
                            <span className="font-medium text-foreground/70">Deadline:</span>{' '}
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                          {task.completedAt && (
                            <span className="text-success">
                              <span className="font-medium">Completed:</span>{' '}
                              {new Date(task.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {task.remarks && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 italic">"{task.remarks}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Task Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Task to Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the task..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To (Manager) <span className="text-destructive">*</span></Label>
              <Select value={form.assignedTo} onValueChange={handleManagerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager..." />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {m.departmentId?.name ? `· ${m.departmentId.name}` : ''} · {m.role.replace(/_/g, ' ')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAssign} disabled={submitting}>
                {submitting ? 'Assigning...' : 'Assign Task'}
              </Button>
              <Button variant="outline" onClick={() => { setAssignDialog(false); setForm(emptyForm); }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
