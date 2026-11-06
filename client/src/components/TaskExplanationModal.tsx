import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  Send,
  User,
  Paperclip,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Crown
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ExplanationItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  designation: string;
  role: string;
  level: number;
  type: string;
  explanation: string;
  evidence?: string[];
  submittedAt: string;
}

interface PendingTaskData {
  task: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    deadline: string;
    department?: { name: string };
    assignee?: { id: string; name: string; email: string; designation?: string; role?: string };
    assigner?: { id: string; name: string; email: string; designation?: string };
  };
  role: 'assignee' | 'superior' | 'ceo';
  explanations: ExplanationItem[];
  previousExplanationCount: number;
  isDirectFailure: boolean;
  subordinateName?: string;
}

export function TaskExplanationModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PendingTaskData | null>(null);
  const [explanation, setExplanation] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const checkPendingExplanation = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/tasks/pending-explanation');
      if (res.data?.success && res.data?.hasPendingExplanation && res.data?.data) {
        setData(res.data.data);
        setOpen(true);
      } else {
        setOpen(false);
        setData(null);
      }
    } catch (_err) {
      // silent
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkPendingExplanation();
      // Check every 60 seconds
      const interval = setInterval(checkPendingExplanation, 60000);
      return () => clearInterval(interval);
    }
  }, [user, checkPendingExplanation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.task?.id) return;
    if (!explanation.trim()) {
      toast.error('Please enter an explanation before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('explanation', explanation.trim());
      if (files) {
        Array.from(files).forEach(f => fd.append('evidence', f));
      }

      const res = await api.post(`/tasks/${data.task.id}/explanation`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data?.message || 'Explanation submitted successfully');
      setExplanation('');
      setFiles(null);
      // Re-check if another explanation is waiting
      await checkPendingExplanation();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit explanation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCeoResolve = async () => {
    if (!data?.task?.id) return;
    setResolving(true);
    try {
      const res = await api.post(`/tasks/${data.task.id}/resolve-escalation`, {
        resolution: explanation.trim() || 'Reviewed and acknowledged by CEO',
        action: 'acknowledged'
      });
      toast.success(res.data?.message || 'Escalation resolved by CEO');
      setExplanation('');
      setFiles(null);
      await checkPendingExplanation();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resolve escalation');
    } finally {
      setResolving(false);
    }
  };

  if (!open || !data) return null;

  const isAssignee = data.role === 'assignee';
  const isSuperior = data.role === 'superior';
  const isCEO = data.role === 'ceo';
  const deadlineDate = data.task.deadline ? new Date(data.task.deadline) : null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-2 border-red-500/50 shadow-2xl [&>button]:hidden"
      >
        {/* Header Alert Strip */}
        <DialogHeader className={cn(
          "p-6 pb-4 border-b border-border",
          isAssignee ? "bg-red-500/10 text-red-700 dark:text-red-400" :
          isSuperior ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
          "bg-blue-500/10 text-blue-700 dark:text-blue-400"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              isAssignee ? "bg-red-600 text-white" :
              isSuperior ? "bg-amber-600 text-white" :
              "bg-blue-600 text-white"
            )}>
              {isCEO ? <Crown className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isAssignee
                    ? 'Mandatory Task Explanation Required'
                    : isSuperior
                    ? 'Subordinate Task Failure: Managerial Explanation Required'
                    : 'Company Executive Review: Task Failure Escalation'}
                </DialogTitle>
                <Badge variant="destructive" className="uppercase text-[10px] tracking-wide font-bold">
                  Action Mandatory
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isAssignee
                  ? 'Your assigned task was not completed by the deadline. In accordance with organizational hierarchy policies, you must provide a detailed explanation to unblock your account.'
                  : isSuperior
                  ? `Your subordinate ${data.subordinateName || data.task.assignee?.name} failed to complete their task. As their superior, your managerial explanation is mandatory before this task escalates further.`
                  : `This task failure has escalated through all intermediate managerial levels in the organizational hierarchy and now awaits final review from the Company CEO.`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Task Info Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-base text-foreground leading-snug">
                  {data.task.title}
                </h3>
                {data.task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {data.task.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={cn(
                "capitalize font-semibold text-xs",
                data.task.priority === 'critical' ? 'border-red-500 text-red-600 bg-red-500/10' :
                data.task.priority === 'high' ? 'border-orange-500 text-orange-600 bg-orange-500/10' :
                'border-blue-500 text-blue-600 bg-blue-500/10'
              )}>
                {data.task.priority} Priority
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned To</span>
                <span className="font-medium text-foreground">{data.task.assignee?.name || 'Staff'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Deadline</span>
                <span className="font-medium text-red-600 dark:text-red-400 font-mono">
                  {deadlineDate ? deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Department</span>
                <span className="font-medium text-foreground">{data.task.department?.name || 'General'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned By</span>
                <span className="font-medium text-foreground">{data.task.assigner?.name || 'Manager'}</span>
              </div>
            </div>
          </div>

          {/* Previous Explanations Audit Trail (if any exist) */}
          {data.explanations && data.explanations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                Hierarchy Escalation Trail ({data.explanations.length} Level{data.explanations.length > 1 ? 's' : ''})
              </Label>
              <div className="space-y-2.5">
                {data.explanations.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-background border">
                          Level {exp.level || idx + 1}
                        </Badge>
                        <span className="font-bold text-foreground">{exp.userName}</span>
                        <span className="text-muted-foreground text-[11px]">({exp.designation || exp.role})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(exp.submittedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-foreground text-xs leading-relaxed pl-2 border-l-2 border-primary/40 italic">
                      "{exp.explanation}"
                    </p>

                    {exp.evidence && exp.evidence.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Proof Attached:</span>
                        {exp.evidence.map((ev, i) => (
                          <a
                            key={i}
                            href={`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${ev}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> View Document {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Input Area */}
          <form id="explanation-form" onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="explanation-text" className="text-xs font-bold text-foreground">
                {isAssignee
                  ? 'Your Detailed Explanation / Justification for Failure'
                  : isSuperior
                  ? 'Your Managerial Explanation / Justification / Action Taken'
                  : 'Company CEO Final Directives / Executive Remarks'} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="explanation-text"
                rows={4}
                required
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder={
                  isAssignee
                    ? 'State clearly what prevented you from completing this task before the deadline...'
                    : isSuperior
                    ? 'State why your subordinate was unable to deliver, what remedial actions you took, and your managerial mitigation...'
                    : 'Enter final executive resolution, warnings, or managerial instructions for this task...'
                }
                className="text-sm resize-none bg-background focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                {isAssignee
                  ? 'This explanation will be permanently recorded and automatically escalated to your superior in the org chart.'
                  : isSuperior
                  ? 'Your explanation will be added to the audit trail and escalated to the next superior up to the Company CEO.'
                  : 'Your remarks will officially resolve and close this organizational escalation chain.'}
              </p>
            </div>

            {/* Optional Evidence Files */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Attach Supporting Evidence / Documents (Optional)
              </Label>
              <input
                type="file"
                multiple
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={e => setFiles(e.target.files)}
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Response is required to proceed</span>
          </div>

          <div className="flex items-center gap-2">
            {isCEO ? (
              <Button
                type="button"
                onClick={handleCeoResolve}
                disabled={resolving || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {resolving ? 'Resolving...' : 'Acknowledge & Resolve Escalation'}
              </Button>
            ) : (
              <Button
                type="submit"
                form="explanation-form"
                disabled={submitting || !explanation.trim()}
                className="bg-primary hover:bg-primary/90 font-semibold text-xs h-9 gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting...' : 'Submit Explanation & Proceed'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
