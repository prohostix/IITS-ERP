import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, CheckCircle, Users, Upload, Paperclip,
  ShieldAlert, ExternalLink, Info, AlertTriangle, X, Search, Sparkles,
  GraduationCap, Building2, Landmark, DollarSign, UserCheck, Settings,
  Target, Check, Tag
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
  assignedBy?: any;
  assigner?: any;
  assignee?: any;
  departmentId?: any;
  department?: any;
  priority: string;
  status: string;
  deadline: string;
  completedAt?: string;
  remarks?: string;
  evidence?: string[];
  explanations?: any[];
  explanationPendingFrom?: string;
  escalationStatus?: string;
  relatedCategory?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
  issueType?: string;
}

interface SubUser {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role?: string;
  departmentId?: string;
}

interface EntityOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface DepartmentTaxonomy {
  id: string;
  label: string;
  icon: any;
  color: string;
  entityType?: 'student' | 'center' | 'university' | 'lead' | 'employee' | null;
  entityLabel?: string;
  entityPlaceholder?: string;
  issues: { id: string; label: string }[];
}

export const DEPARTMENT_TAXONOMY: Record<string, DepartmentTaxonomy> = {
  general: {
    id: 'general',
    label: 'Direct / General Task',
    icon: Sparkles,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    entityType: null,
    issues: [
      { id: 'general_task', label: 'General Direct Task' },
      { id: 'meeting_review', label: 'Internal Review / Team Meeting' },
      { id: 'follow_up', label: 'Follow-up on Previous Directive' },
      { id: 'documentation', label: 'Documentation & Reporting' },
      { id: 'urgent_action', label: 'Urgent Operational Action' }
    ]
  },
  student: {
    id: 'student',
    label: 'Student & Academics',
    icon: GraduationCap,
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    entityType: 'student',
    entityLabel: 'Select Specific Student',
    entityPlaceholder: 'Type student name, register no, or phone...',
    issues: [
      { id: 'fee_payment', label: 'Payment / Fee Collection / Installment Dues' },
      { id: 'document_verification', label: 'Document Verification / Pending KYC' },
      { id: 'admission_enrollment', label: 'Admission / Enrollment Approval' },
      { id: 'marks_exam', label: 'Internal Marks / Exam Hall Ticket' },
      { id: 'certificate_marksheet', label: 'Certificate / Degree / Marksheet Request' },
      { id: 'attendance_shortage', label: 'Attendance Shortage / Regularization' },
      { id: 'course_transfer', label: 'Course / Session Change Request' },
      { id: 'student_query', label: 'General Student Query / Complaint' }
    ]
  },
  center: {
    id: 'center',
    label: 'Study Center',
    icon: Building2,
    color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
    entityType: 'center',
    entityLabel: 'Select Study Center',
    entityPlaceholder: 'Type center name, code, or city...',
    issues: [
      { id: 'commission_payout', label: 'Center Commission / Payout Clearance' },
      { id: 'student_admissions', label: 'Student Admissions from Center' },
      { id: 'center_verification', label: 'Center Verification & Onboarding' },
      { id: 'wallet_topup', label: 'Wallet Top-up & Balance Discrepancy' },
      { id: 'agreement_renewal', label: 'Agreement Renewal & License Validity' },
      { id: 'center_grievance', label: 'Center Grievance / Audit Discrepancy' },
      { id: 'general_center', label: 'General Center Operations' }
    ]
  },
  university: {
    id: 'university',
    label: 'University & Session',
    icon: Landmark,
    color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    entityType: 'university',
    entityLabel: 'Select University',
    entityPlaceholder: 'Type university name or code...',
    issues: [
      { id: 'auth_fee_structure', label: 'University Auth Fee / Fee Structure' },
      { id: 'session_request', label: 'Admission Session Request / Extension' },
      { id: 'program_allocation', label: 'Program & Syllabus Allocation' },
      { id: 'result_marks_sync', label: 'Exam Results & Marksheet Sync' },
      { id: 'general_university', label: 'General University Communication' }
    ]
  },
  sales: {
    id: 'sales',
    label: 'Sales & Admissions (Lead)',
    icon: Target,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    entityType: 'lead',
    entityLabel: 'Select Lead',
    entityPlaceholder: 'Type lead name, center, or phone...',
    issues: [
      { id: 'lead_callback', label: 'Lead Follow-up & Callback' },
      { id: 'student_counseling', label: 'Course Counseling & Student Guidance' },
      { id: 'fee_concession', label: 'Fee Concession / Discount Approval' },
      { id: 'admission_target', label: 'Admission Target & Lead Closure' },
      { id: 'new_center_conversion', label: 'New Study Center Tie-up / Conversion' },
      { id: 'general_sales', label: 'General Sales & Marketing Task' }
    ]
  },
  finance: {
    id: 'finance',
    label: 'Finance & Accounts',
    icon: DollarSign,
    color: 'text-teal-600 bg-teal-500/10 border-teal-500/20',
    entityType: null,
    issues: [
      { id: 'fee_reconciliation', label: 'Student Fee Reconciliation & Receipts' },
      { id: 'commission_clearance', label: 'Center Commission Calculation & Transfer' },
      { id: 'refund_processing', label: 'Student / Center Refund Processing' },
      { id: 'gst_tax_invoice', label: 'GST Invoicing & Tax Compliance' },
      { id: 'expense_claim', label: 'Employee Expense Claim Verification' },
      { id: 'vendor_payment', label: 'Vendor / Partner Payment Clearance' },
      { id: 'audit_finance', label: 'Financial Audit & Balance Discrepancy' }
    ]
  },
  hr: {
    id: 'hr',
    label: 'Human Resources (HR)',
    icon: UserCheck,
    color: 'text-pink-600 bg-pink-500/10 border-pink-500/20',
    entityType: 'employee',
    entityLabel: 'Select Employee',
    entityPlaceholder: 'Type employee name...',
    issues: [
      { id: 'leave_approval', label: 'Leave Request & Shift Regularization' },
      { id: 'attendance_correction', label: 'Attendance & Biometrics Correction' },
      { id: 'payroll_query', label: 'Salary / Payslip Query' },
      { id: 'performance_review', label: 'Performance Review & KPI Evaluation' },
      { id: 'onboarding_kyc', label: 'Employee Onboarding & Document Verification' },
      { id: 'hiring_interview', label: 'Hiring & Candidate Interview Scheduling' },
      { id: 'general_hr', label: 'General HR / Policy Inquiry' }
    ]
  },
  operations: {
    id: 'operations',
    label: 'Operations & Process',
    icon: Settings,
    color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    entityType: null,
    issues: [
      { id: 'ops_audit', label: 'Operations Audit & Quality Check' },
      { id: 'material_dispatch', label: 'Study Material & ID Card Dispatch' },
      { id: 'it_credentials', label: 'IT Credentials & Software Access' },
      { id: 'branch_review', label: 'Branch Operations Review' },
      { id: 'policy_announcement', label: 'Circulate Policy / Official Announcement' },
      { id: 'general_ops', label: 'General Operational Task' }
    ]
  }
};

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Multi-user assignment selection
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Context entity selection
  const [entitySearch, setEntitySearch] = useState('');
  const [entityResults, setEntityResults] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
    relatedCategory: 'general',
    relatedEntityType: '',
    relatedEntityId: '',
    relatedEntityName: '',
    issueType: ''
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

  // Search context entities dynamically
  useEffect(() => {
    const currentTax = DEPARTMENT_TAXONOMY[formData.relatedCategory];
    if (!currentTax || !currentTax.entityType) {
      setEntityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingEntities(true);
      try {
        const res = await api.get('/tasks/context-entities', {
          params: { type: currentTax.entityType, search: entitySearch }
        });
        setEntityResults(res.data.data || []);
      } catch (_e) {
        setEntityResults([]);
      } finally {
        setLoadingEntities(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.relatedCategory, entitySearch]);

  const handleCategoryChange = (catKey: string) => {
    const tax = DEPARTMENT_TAXONOMY[catKey] || DEPARTMENT_TAXONOMY.general;
    setFormData(prev => ({
      ...prev,
      relatedCategory: catKey,
      relatedEntityType: tax.entityType || '',
      relatedEntityId: '',
      relatedEntityName: '',
      issueType: ''
    }));
    setEntitySearch('');
    setEntityResults([]);
  };

  const handleAutoSuggestTitle = () => {
    const tax = DEPARTMENT_TAXONOMY[formData.relatedCategory];
    const issueObj = tax?.issues.find(i => i.id === formData.issueType);
    const issueShort = issueObj ? issueObj.label.split('/')[0].trim() : '';

    if (formData.relatedEntityName && issueShort) {
      setFormData(prev => ({ ...prev, title: `${issueShort} - ${prev.relatedEntityName}` }));
    } else if (formData.relatedEntityName) {
      setFormData(prev => ({ ...prev, title: `Task for ${prev.relatedEntityName}` }));
    } else if (issueShort) {
      setFormData(prev => ({ ...prev, title: issueShort }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTask) {
      if (!formData.assignedTo) {
        alert('Please select an assignee.');
        return;
      }
      const selectedUser = subordinates.find(s => s.id === formData.assignedTo);
      const payload: any = { ...formData };
      if (selectedUser?.departmentId) {
        payload.departmentId = selectedUser.departmentId;
      }
      try {
        await api.put(`/tasks/${editingTask.id || (editingTask as any)._id}`, payload);
        setDialogOpen(false);
        resetForm();
        fetchTasks();
      } catch (e: any) {
        alert(e.response?.data?.message || 'Failed to update task.');
      }
    } else {
      if (selectedAssignees.length === 0) {
        alert('Please select at least one team member to assign this task.');
        return;
      }
      const payload: any = {
        ...formData,
        assignedToIds: selectedAssignees
      };
      try {
        await api.post('/tasks', payload);
        setDialogOpen(false);
        resetForm();
        fetchTasks();
      } catch (e: any) {
        alert(e.response?.data?.message || 'Failed to create task.');
      }
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
    const assigneeId = (task as any).assignedTo?.id || task.assignedTo || '';
    setSelectedAssignees(assigneeId ? [assigneeId] : []);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: assigneeId,
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      relatedCategory: task.relatedCategory || 'general',
      relatedEntityType: task.relatedEntityType || '',
      relatedEntityId: task.relatedEntityId || '',
      relatedEntityName: task.relatedEntityName || '',
      issueType: task.issueType || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      deadline: '',
      relatedCategory: 'general',
      relatedEntityType: '',
      relatedEntityId: '',
      relatedEntityName: '',
      issueType: ''
    });
    setSelectedAssignees([]);
    setEditingTask(null);
    setEntitySearch('');
    setEntityResults([]);
  };

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

  const filteredTasks = tasks.filter(t => {
    // 1. Tab filter
    let tabMatch = true;
    switch (activeTab) {
      case 'assigned': tabMatch = ((t as any).assigner?.id || (t as any).createdBy) === currentUserId; break;
      case 'my': tabMatch = ((t as any).assignee?.id || (t as any).assignedTo) === currentUserId; break;
      case 'overdue': tabMatch = getTaskStatus(t) === 'overdue'; break;
      case 'upcoming': tabMatch = getTaskStatus(t) === 'upcoming' && t.status !== 'completed'; break;
      case 'pending': tabMatch = (t.status === 'pending' || t.status === 'in_progress') && getTaskStatus(t) !== 'overdue'; break;
      case 'completed': tabMatch = t.status === 'completed'; break;
      default: tabMatch = true;
    }
    if (!tabMatch) return false;

    // 2. Category filter
    if (categoryFilter !== 'all') {
      if (t.relatedCategory !== categoryFilter) return false;
    }

    // 3. Search query filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchEntity = t.relatedEntityName?.toLowerCase().includes(q);
      const matchIssue = t.issueType?.toLowerCase().includes(q);
      const matchAssignee = (t as any).assignee?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchEntity && !matchIssue && !matchAssignee) return false;
    }

    return true;
  });

  const filteredSubordinates = subordinates.filter(s =>
    !assigneeSearch ||
    s.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    (s.designation && s.designation.toLowerCase().includes(assigneeSearch.toLowerCase()))
  );

  const hasSubordinates = subordinates.some(s => s.id !== currentUserId);
  const currentCategoryTax = DEPARTMENT_TAXONOMY[formData.relatedCategory] || DEPARTMENT_TAXONOMY.general;

  if (loading) return (
    <Card><CardContent className="p-8 text-center text-muted-foreground">Loading tasks...</CardContent></Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle>Task Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Hierarchy-based task assignment, multi-assignee workflows, and department issue tracking
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Assign Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Assign tasks to one or multiple team members down your hierarchy chain with specific department context.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">

              {/* 1. Context & Specific Issue Selection */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Specific Issue &amp; Department Context
                  </span>
                  {(formData.relatedEntityName || formData.issueType) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAutoSuggestTitle}
                      className="h-6 text-[11px] text-primary gap-1 px-2 hover:bg-primary/10"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-fill Title
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Dropdown */}
                  <div>
                    <Label className="text-xs">Category / Department</Label>
                    <Select value={formData.relatedCategory} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(DEPARTMENT_TAXONOMY).map(tax => (
                          <SelectItem key={tax.id} value={tax.id} className="text-xs">
                            {tax.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specific Issue Type Dropdown */}
                  <div>
                    <Label className="text-xs">Specific Issue Type</Label>
                    <Select
                      value={formData.issueType}
                      onValueChange={v => setFormData(prev => ({ ...prev, issueType: v }))}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue placeholder="Select Specific Issue" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentCategoryTax.issues.map(iss => (
                          <SelectItem key={iss.id} value={iss.id} className="text-xs">
                            {iss.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Specific Entity Selector (Student, Center, University, Lead, Employee) */}
                {currentCategoryTax.entityType && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        {currentCategoryTax.entityLabel || 'Select Specific Entity'}
                      </Label>
                      {formData.relatedEntityName && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, relatedEntityId: '', relatedEntityName: '' }))}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {formData.relatedEntityName ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                        <span className="font-semibold text-primary truncate">
                          ✓ Linked: {formData.relatedEntityName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setFormData(prev => ({ ...prev, relatedEntityId: '', relatedEntityName: '' }))}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            placeholder={currentCategoryTax.entityPlaceholder || 'Search records...'}
                            value={entitySearch}
                            onChange={e => setEntitySearch(e.target.value)}
                            className="text-xs h-8 pl-8"
                          />
                        </div>

                        {entityResults.length > 0 && (
                          <div className="max-h-36 overflow-y-auto border rounded-lg divide-y bg-background text-xs shadow-sm">
                            {entityResults.map(item => (
                              <div
                                key={item.id}
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  relatedEntityId: item.id,
                                  relatedEntityName: `${item.label}${item.subLabel ? ` (${item.subLabel})` : ''}`
                                }))}
                                className="p-2 hover:bg-muted cursor-pointer transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-foreground">{item.label}</p>
                                  {item.subLabel && <p className="text-[10px] text-muted-foreground">{item.subLabel}</p>}
                                </div>
                                <span className="text-[10px] text-primary font-medium">Select</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {loadingEntities && (
                          <p className="text-[11px] text-muted-foreground italic px-1">Searching records...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Task Details */}
              <div>
                <Label>Task Title</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required placeholder="e.g., Payment follow-up for Student Rahul K"
                />
              </div>
              <div>
                <Label>Description &amp; Deliverables</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required placeholder="Detailed instructions, action items, and expected outcome..." rows={3}
                />
              </div>

              {/* 3. Assign To (Multi-User Assignment) */}
              {editingTask ? (
                // Single Assignee view when editing an existing task
                <div className="space-y-1.5">
                  <Label>Reassign To</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={v => setFormData({ ...formData, assignedTo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubordinates.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.id === currentUserId ? `${s.name} (Myself)` : `${s.name}${s.designation ? ` — ${s.designation}` : ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                // Multi-User Assignment Selector for New Tasks
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Assign To Team Members</span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        ({selectedAssignees.length} selected)
                      </span>
                    </Label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAssignees.length === filteredSubordinates.length) {
                            setSelectedAssignees([]);
                          } else {
                            setSelectedAssignees(filteredSubordinates.map(s => s.id));
                          }
                        }}
                        className="text-primary hover:underline text-[11px] font-medium"
                      >
                        {selectedAssignees.length === filteredSubordinates.length ? 'Clear All' : 'Select All'}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUserId && !selectedAssignees.includes(currentUserId)) {
                            setSelectedAssignees(prev => [...prev, currentUserId]);
                          }
                        }}
                        className="text-primary hover:underline text-[11px] font-medium"
                      >
                        + Myself
                      </button>
                    </div>
                  </div>

                  {!hasSubordinates && (
                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>You do not have direct subordinates in the org hierarchy. You can assign personal tasks to yourself.</span>
                    </div>
                  )}

                  {/* Selected Assignees Chips */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-lg border border-border min-h-[38px] max-h-24 overflow-y-auto">
                    {selectedAssignees.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No team members selected. Pick below.</span>
                    ) : (
                      selectedAssignees.map(userId => {
                        const sub = subordinates.find(s => s.id === userId);
                        const name = userId === currentUserId ? `${user?.name || 'Myself'} (Personal)` : (sub?.name || 'Staff');
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs font-medium bg-background border">
                            <span>{name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedAssignees(prev => prev.filter(id => id !== userId))}
                              className="hover:bg-muted rounded p-0.5"
                            >
                              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  {/* Filter input */}
                  <Input
                    placeholder="Type to filter team members..."
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    className="text-xs h-8"
                  />

                  {/* Subordinate Checkbox List */}
                  <div className="max-h-36 overflow-y-auto border rounded-lg divide-y bg-background text-xs">
                    {filteredSubordinates.length === 0 ? (
                      <p className="p-3 text-muted-foreground text-center">No team members found</p>
                    ) : (
                      filteredSubordinates.map(s => {
                        const isChecked = selectedAssignees.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedAssignees(prev =>
                                prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            className={cn(
                              'flex items-center justify-between p-2 cursor-pointer transition-colors hover:bg-muted/50',
                              isChecked && 'bg-primary/5'
                            )}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <div className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                              )}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium text-foreground">
                                {s.id === currentUserId ? `${s.name} (Myself — Personal Task)` : s.name}
                              </span>
                              {s.designation && (
                                <span className="text-[11px] text-muted-foreground truncate">({s.designation})</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 4. Priority & Deadline */}
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
                <Button type="submit">
                  {editingTask ? 'Save Changes' : (
                    selectedAssignees.length > 1
                      ? `Assign Task to ${selectedAssignees.length} Members`
                      : 'Assign Task'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {/* Filters bar: Tabs + Category Filter + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
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
          </Tabs>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                {Object.values(DEPARTMENT_TAXONOMY).map(tax => (
                  <SelectItem key={tax.id} value={tax.id} className="text-xs">
                    {tax.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-[160px] md:w-[200px] h-9 text-xs pl-8"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tasks match the selected filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const taskId = task.id || (task as any)._id || '';
              const isAssignedByMe = (task as any).createdBy === currentUserId || (task as any).assigner?.id === currentUserId;
              const isAssignedToMe = (task as any).assignedTo === currentUserId || (task as any).assignee?.id === currentUserId;
              const effectiveStatus = getTaskStatus(task);
              const hasExplanations = task.explanations && task.explanations.length > 0;
              const taskTax = task.relatedCategory ? DEPARTMENT_TAXONOMY[task.relatedCategory] : null;
              const issueObj = taskTax?.issues.find(i => i.id === task.issueType);

              return (
                <div key={taskId} className="flex items-start justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors gap-3">
                  <div className="flex-1 space-y-1.5">
                    {/* Header Row: Title, Badges */}
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

                      {/* Department Context Badges */}
                      {taskTax && (
                        <Badge variant="outline" className={cn('text-[10px] gap-1 font-medium', taskTax.color)}>
                          <taskTax.icon className="w-3 h-3" />
                          <span>{taskTax.label.split('/')[0].trim()}</span>
                        </Badge>
                      )}
                      {task.relatedEntityName && (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-medium">
                          {task.relatedEntityName}
                        </Badge>
                      )}
                      {issueObj && (
                        <Badge variant="outline" className="text-[10px] bg-muted/60 text-foreground font-medium">
                          {issueObj.label}
                        </Badge>
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
                      <span><strong>To:</strong> {(task as any).assignee?.name || 'Staff'}</span>
                      <span><strong>By:</strong> {(task as any).assigner?.name || 'Staff'}</span>
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
                  Task Failure Explanations &amp; Escalation Trail
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
