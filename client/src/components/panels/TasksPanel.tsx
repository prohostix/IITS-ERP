import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, CheckCircle, Users, Upload, Paperclip,
  ShieldAlert, ExternalLink, Info, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Task {
  id?: string;
  title: string;
  description: string;
  assignedTo: any;
  assignedBy: any;
  departmentId?: any;
  priority: string;
  status: string;
  deadline: string;
  completedAt?: string;
  remarks?: string;
  evidence?: string[];
  explanations?: any[];
  explanationPendingFrom?: string;
  escalationStatus?: string;
}

interface SubUser {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role?: string;
  departmentId?: string;
}

export function TasksPanel() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subordinates, setSubordinates] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [selectedExplanationTask, setSelectedExplanationTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
  });

  const [completeData, setCompleteData] = useState({ remarks: '', files: null as FileList | null });

  useEffect(() => {
    fetchTasks();
    fetchSubordinates();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchSubordinates = async () => {
    try {
      const res = await api.get('/tasks/assignable-users');
      setSubordinates(res.data.data || []);
    } catch (_e) {
    }
  };

  const currentUserId = user?.id || (user as any)?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedTo) return;

    // Auto-derive departmentId from the selected subordinate
    const selectedUser = subordinates.find(s => s.id === formData.assignedTo);
    const payload: any = { ...formData };
    if (selectedUser?.departmentId) {
      payload.departmentId = selectedUser.departmentId;
    }

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id || (editingTask as any)._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save task.');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    try {
      const fd = new FormData();
      fd.append('remarks', completeData.remarks);
      if (completeData.files) {
        Array.from(completeData.files).forEach(f => fd.append('evidence', f));
      }
      await api.put(`/tasks/${completingTask.id || (completingTask as any)._id}/complete`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCompleteDialogOpen(false);
      setCompleteData({ remarks: '', files: null });
      setCompletingTask(null);
      fetchTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to complete task.');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (_e) {
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: (task as any).assignedTo?.id || task.assignedTo || '',
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', assignedTo: '', priority: 'medium', deadline: '' });
    setEditingTask(null);
  };

  const [assigneeSearch, setAssigneeSearch] = useState('');

  const priorityColor = (p: string) => ({
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }[p] || 'bg-gray-100 text-gray-800');

  const statusColor = (s: string) => ({
    completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-800 border-red-300 font-bold dark:bg-red-900/30 dark:text-red-400',
    upcoming: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-muted dark:text-muted-foreground',
  }[s] || 'bg-gray-100 text-gray-800');

  const getTaskStatus = (task: Task) => {
    if (task.status === 'completed') return 'completed';
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      const now = new Date();
      if (deadlineDate.getTime() < now.getTime()) {
        return 'overdue';
      }
      const daysUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil >= 0 && daysUntil <= 7) {
        return 'upcoming';
      }
    }
    return task.status || 'pending';
  };

  const overdueCount = tasks.filter(t => getTaskStatus(t) === 'overdue').length;
  const upcomingCount = tasks.filter(t => getTaskStatus(t) === 'upcoming' && t.status !== 'completed').length;

  const filteredTasks = (() => {
    switch (activeTab) {
      case 'assigned': return tasks.filter(t => ((t as any).assigner?.id || (t as any).createdBy) === currentUserId);
      case 'my': return tasks.filter(t => ((t as any).assignee?.id || (t as any).assignedTo) === currentUserId);
      case 'overdue': return tasks.filter(t => getTaskStatus(t) === 'overdue');
      case 'upcoming': return tasks.filter(t => getTaskStatus(t) === 'upcoming' && t.status !== 'completed');
      case 'pending': return tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && getTaskStatus(t) !== 'overdue');
      case 'completed': return tasks.filter(t => t.status === 'completed');
      default: return tasks;
    }
  })();

  const filteredSubordinates = subordinates.filter(s =>
    !assigneeSearch ||
    s.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    (s.designation && s.designation.toLowerCase().includes(assigneeSearch.toLowerCase()))
  );

  const hasSubordinates = subordinates.some(s => s.id !== currentUserId);

  if (loading) return (
    <Card><CardContent className="p-8 text-center text-muted-foreground">Loading tasks...</CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle>Task Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Hierarchy-based task assignment, tracking, and cascading escalation workflows
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Assign Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                In accordance with org hierarchy, superiors can assign tasks to subordinates below them.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Task Title</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required placeholder="e.g., Complete monthly operations audit"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required placeholder="Detailed instructions and deliverables..." rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Assign To</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Subordinates in Org Chart)
                  </span>
                </Label>

                {!hasSubordinates && (
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>You do not have direct subordinates below you in the org chart. You can assign personal tasks to yourself.</span>
                  </div>
                )}

                <Input
                  placeholder="Type to filter team members..."
                  value={assigneeSearch}
                  onChange={e => setAssigneeSearch(e.target.value)}
                  className="text-xs h-8 mb-1"
                />
                <Select
                  value={formData.assignedTo}
                  onValueChange={v => setFormData({ ...formData, assignedTo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubordinates.length === 0 ? (
                      <SelectItem value="__none__" disabled>No team members available</SelectItem>
                    ) : (
                      filteredSubordinates.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.id === currentUserId ? `${s.name} (Myself — Personal Task)` : `${s.name}${s.designation ? ` — ${s.designation}` : ''}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingTask ? 'Save Changes' : 'Assign Task'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="assigned">Assigned by Me</TabsTrigger>
            <TabsTrigger value="my">My Tasks</TabsTrigger>
            <TabsTrigger value="overdue" className="text-red-600 data-[state=active]:bg-red-500/10">
              Overdue {overdueCount > 0 && <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">{overdueCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-amber-600 data-[state=active]:bg-amber-500/10">
              Upcoming {upcomingCount > 0 && <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-bold">{upcomingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const taskId = task.id || (task as any)._id || '';
                  const isAssignedByMe = (task as any).createdBy === currentUserId || (task as any).assigner?.id === currentUserId;
                  const isAssignedToMe = (task as any).assignedTo === currentUserId || (task as any).assignee?.id === currentUserId;
                  const effectiveStatus = getTaskStatus(task);
                  const hasExplanations = task.explanations && task.explanations.length > 0;

                  return (
                    <div key={taskId} className="flex items-start justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{task.title}</h3>
                          <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
                          {effectiveStatus === 'overdue' ? (
                            <Badge className="bg-red-500/10 text-red-600 border border-red-500/30 font-bold gap-1">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </Badge>
                          ) : effectiveStatus === 'upcoming' ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 font-semibold">Upcoming</Badge>
                          ) : (
                            <Badge className={statusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                          )}
                          {hasExplanations && (
                            <button
                              type="button"
                              onClick={() => setSelectedExplanationTask(task)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition-colors"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              {task.explanations!.length} Explanation{task.explanations!.length > 1 ? 's' : ''} in Chain
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">{task.description}</p>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                          <span><strong>To:</strong> {(task as any).assignee?.name || 'Unknown'}</span>
                          <span><strong>By:</strong> {(task as any).assigner?.name || 'Unknown'}</span>
                          <span><strong>Due:</strong> {new Date(task.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {task.department && <span><strong>Dept:</strong> {task.department.name}</span>}
                        </div>

                        {task.remarks && <p className="text-xs text-muted-foreground italic">Remarks: {task.remarks}</p>}

                        {task.evidence && task.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {task.evidence.map((url, i) => (
                              <a
                                key={i}
                                href={url.startsWith('/') ? `${url}` : url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                <Paperclip className="w-3 h-3" /> Evidence {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAssignedToMe && task.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                            onClick={() => { setCompletingTask(task); setCompleteDialogOpen(true); }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                          </Button>
                        )}
                        {isAssignedByMe && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(task)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(taskId)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Task</DialogTitle></DialogHeader>
          {completingTask && (
            <div className="mb-3 p-3 bg-muted rounded-xl">
              <p className="font-semibold text-sm">{completingTask.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{completingTask.description}</p>
            </div>
          )}
          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <Label>Completion Remarks</Label>
              <Textarea
                value={completeData.remarks}
                onChange={e => setCompleteData({ ...completeData, remarks: e.target.value })}
                placeholder="Describe completed work or deliverables..." rows={3}
              />
            </div>
            <div>
              <Label>Evidence / Screenshots (optional)</Label>
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors mt-1">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {completeData.files && completeData.files.length > 0
                    ? `${completeData.files.length} file(s) selected`
                    : 'Click to upload proof or deliverables'}
                </span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, PDF, DOC — up to 5 files</span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => setCompleteData({ ...completeData, files: e.target.files })}
                />
              </label>
              {completeData.files && completeData.files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {Array.from(completeData.files).map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />{f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => { setCompleteDialogOpen(false); setCompleteData({ remarks: '', files: null }); }}>Cancel</Button>
              <Button type="submit">Mark as Complete</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Explanations & Escalation Audit Trail Dialog */}
      <Dialog open={!!selectedExplanationTask} onOpenChange={() => setSelectedExplanationTask(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Task Failure Explanations & Escalation Trail
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Hierarchy chain from subordinate to superior up to Company CEO
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedExplanationTask && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1">
                <p className="font-bold text-foreground">{selectedExplanationTask.title}</p>
                <p className="text-muted-foreground">Assigned to: {(selectedExplanationTask as any).assignee?.name || 'Staff'}</p>
                <p className="text-muted-foreground">Deadline: {new Date(selectedExplanationTask.deadline).toLocaleDateString('en-IN')}</p>
              </div>

              <div className="space-y-3">
                {selectedExplanationTask.explanations?.map((exp: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold">Level {exp.level || idx + 1}</Badge>
                        <span className="font-bold text-foreground">{exp.userName}</span>
                        <span className="text-muted-foreground text-[11px]">({exp.designation || exp.role})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(exp.submittedAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <p className="italic text-foreground border-l-2 border-primary/50 pl-2.5">
                      "{exp.explanation}"
                    </p>

                    {exp.evidence && exp.evidence.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Evidence:</span>
                        {exp.evidence.map((ev: string, i: number) => (
                          <a
                            key={i}
                            href={`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${ev}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> Proof {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border bg-card">
            <Button variant="outline" size="sm" onClick={() => setSelectedExplanationTask(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
