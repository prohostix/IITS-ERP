import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
  Upload,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  Lock,
  Receipt,
  Users,
  CheckSquare,
  Square,
  Eye,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FinanceUniversityFeeReportPanel } from './FinanceUniversityFeeReportPanel';
import { TransactionBreakdownModal } from './TransactionBreakdownModal';

interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  program: {
    name: string;
    code: string;
    university?: {
      name: string;
    };
  };
  center: {
    name: string;
    code: string;
  };
}

interface UniversityFeePayment {
  id: string;
  enrollmentId: string;
  semesterOrYear: string;
  amount: number;
  status: string;
  batchId?: string;
  referenceNo?: string;
  paidAt?: string;
  screenshot?: string;
  createdAt: string;
  student: Student;
}

export function FinanceUniversityFeePanel() {
  const [payments, setPayments] = useState<UniversityFeePayment[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [universityFilter, setUniversityFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [search, setSearch] = useState('');
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'report'>('pending');

  // Single Pay Dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; payment: UniversityFeePayment | null }>({ open: false, payment: null });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    referenceNo: '',
    paidAt: new Date().toISOString().split('T')[0],
    screenshot: null as File | null
  });

  // Multi-Selection State for Bulk Payment
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Record<string, boolean>>({});
  const [bulkPayDialogOpen, setBulkPayDialogOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    referenceNo: '',
    paidAt: new Date().toISOString().split('T')[0],
    screenshot: null as File | null
  });

  // Paid Tab View Mode & Batches History
  const [paidViewMode, setPaidViewMode] = useState<'batches' | 'students'>('batches');
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Transaction Breakdown Modal
  const [breakdownIdentifier, setBreakdownIdentifier] = useState<string | null>(null);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const fetchUniversities = useCallback(async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (_err) {}
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (_err) {}
  }, []);

  const fetchCenters = useCallback(async () => {
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (_err) {}
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (universityFilter && universityFilter !== 'all') query.append('universityId', universityFilter);
      if (centerFilter && centerFilter !== 'all') query.append('centerId', centerFilter);
      if (programFilter && programFilter !== 'all') query.append('programId', programFilter);
      if (search) query.append('search', search);

      const res = await api.get(`/finance/university-fees?${query.toString()}`);
      setPayments(res.data.data || []);
      setExpandedStudents({});
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load university fees');
    } finally {
      setLoading(false);
    }
  }, [universityFilter, centerFilter, programFilter, search]);

  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const query = new URLSearchParams();
      if (universityFilter && universityFilter !== 'all') query.append('universityId', universityFilter);
      if (search) query.append('search', search);

      const res = await api.get(`/finance/university-fees/batches?${query.toString()}`);
      setBatches(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load university fee batches', err);
    } finally {
      setBatchesLoading(false);
    }
  }, [universityFilter, search]);

  useEffect(() => {
    fetchPayments();
    fetchUniversities();
    fetchCenters();
    fetchPrograms();
  }, [fetchPayments, fetchUniversities, fetchCenters, fetchPrograms]);

  useEffect(() => {
    if (activeTab === 'paid') {
      fetchBatches();
    }
  }, [activeTab, fetchBatches]);

  const handlePayClick = (p: UniversityFeePayment) => {
    setPayDialog({ open: true, payment: p });
    setForm({
      referenceNo: '',
      paidAt: new Date().toISOString().split('T')[0],
      screenshot: null
    });
  };

  const handlePaySubmit = async () => {
    if (!payDialog.payment) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('referenceNo', form.referenceNo);
      formData.append('paidAt', form.paidAt);
      if (form.screenshot) {
        formData.append('screenshot', form.screenshot);
      }

      await api.post(`/finance/university-fees/${payDialog.payment.id}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('University fee marked as paid successfully');
      setPayDialog({ open: false, payment: null });
      fetchPayments();
      fetchBatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedPayments = useMemo(() => {
    return payments.reduce((acc: any, p: any) => {
      if (!acc[p.enrollmentId]) {
        acc[p.enrollmentId] = {
          student: p.student,
          enrollmentId: p.enrollmentId,
          cycles: []
        };
      }
      acc[p.enrollmentId].cycles.push(p);
      return acc;
    }, {} as Record<string, { student: Student; enrollmentId: string; cycles: UniversityFeePayment[] }>);
  }, [payments]);

  const groupedArray = Object.values(groupedPayments).filter(group => {
    if (activeTab === 'pending') {
      return group.cycles.some(c => c.status === 'pending');
    } else {
      return group.cycles.some(c => c.status === 'paid');
    }
  });

  // Multi-Selection Logic
  const allSelectablePendingPayments = useMemo(() => {
    return payments.filter(p => p.status === 'pending');
  }, [payments]);

  const selectedPaymentsList = useMemo(() => {
    return allSelectablePendingPayments.filter(p => selectedPaymentIds[p.id]);
  }, [allSelectablePendingPayments, selectedPaymentIds]);

  const selectedCount = selectedPaymentsList.length;
  const selectedTotalAmount = selectedPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

  const isAllSelected =
    allSelectablePendingPayments.length > 0 &&
    allSelectablePendingPayments.every(p => selectedPaymentIds[p.id]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPaymentIds({});
    } else {
      const next: Record<string, boolean> = {};
      allSelectablePendingPayments.forEach(p => {
        next[p.id] = true;
      });
      setSelectedPaymentIds(next);
    }
  };

  const toggleSelectPayment = (paymentId: string) => {
    setSelectedPaymentIds(prev => {
      const next = { ...prev };
      if (next[paymentId]) {
        delete next[paymentId];
      } else {
        next[paymentId] = true;
      }
      return next;
    });
  };

  const toggleStudent = (id: string) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Bulk Payment Submission
  const handleBulkPaySubmit = async () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one student fee payment');
      return;
    }
    if (!bulkForm.referenceNo.trim()) {
      toast.error('Please enter the UTR / Reference No for this consolidated university transaction');
      return;
    }

    setBulkSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('paymentIds', JSON.stringify(selectedPaymentsList.map(p => p.id)));
      formData.append('referenceNo', bulkForm.referenceNo.trim());
      formData.append('paidAt', bulkForm.paidAt);
      if (bulkForm.screenshot) {
        formData.append('screenshot', bulkForm.screenshot);
      }

      const res = await api.post('/finance/university-fees/batch-pay', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data?.message || `Successfully recorded payment for ${selectedCount} students`);
      setBulkPayDialogOpen(false);
      setSelectedPaymentIds({});
      fetchPayments();
      fetchBatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit bulk payment');
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">University Fee Payments</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage, bulk-disburse, and track university fee remittances with consolidated transaction breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchPayments();
              if (activeTab === 'paid') fetchBatches();
            }}
            disabled={loading || batchesLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', (loading || batchesLoading) && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, enrollment no, or UTR/Ref..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Universities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={centerFilter} onValueChange={setCenterFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Centers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Centers</SelectItem>
            {centers.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" /> Pending Fees
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Payment History
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" /> Payment Report
          </TabsTrigger>
        </TabsList>

        {/* ─── PENDING TAB ─────────────────────────────────────────────── */}
        <TabsContent value="pending" className="space-y-4 mt-2">
          {/* Sticky Bulk Action Banner */}
          {selectedCount > 0 && (
            <div className="sticky top-2 z-20 bg-card border-2 border-primary/40 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow">
                  {selectedCount}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{selectedCount} Student Fee{selectedCount > 1 ? 's' : ''} Selected for Single University Remittance</span>
                    <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                      Consolidated Batch
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total Consolidated Payable to University:{' '}
                    <span className="font-bold text-primary font-mono text-sm">
                      ₹{selectedTotalAmount.toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPaymentIds({})}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md gap-1.5"
                  onClick={() => {
                    setBulkForm({
                      referenceNo: '',
                      paidAt: new Date().toISOString().split('T')[0],
                      screenshot: null
                    });
                    setBulkPayDialogOpen(true);
                  }}
                >
                  <Receipt className="w-4 h-4" />
                  Pay Selected to University (₹{selectedTotalAmount.toLocaleString('en-IN')})
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : groupedArray.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No pending university fee payments found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="w-10 p-3 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          title={isAllSelected ? 'Deselect All' : 'Select All Pending'}
                          className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="w-8"></th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Program & Center</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groupedArray.map(group => {
                      const isExpanded = expandedStudents[group.enrollmentId];
                      const pendingCycles = group.cycles.filter(c => c.status === 'pending');
                      const totalPendingAmount = pendingCycles.reduce((sum, c) => sum + c.amount, 0);

                      const isStudentAllSelected =
                        pendingCycles.length > 0 &&
                        pendingCycles.every(c => selectedPaymentIds[c.id]);
                      const isStudentPartiallySelected =
                        pendingCycles.some(c => selectedPaymentIds[c.id]) && !isStudentAllSelected;

                      return (
                        <React.Fragment key={group.enrollmentId}>
                          <tr
                            className={cn(
                              'hover:bg-muted/20 transition-colors cursor-pointer',
                              isStudentAllSelected && 'bg-primary/5'
                            )}
                            onClick={() => toggleStudent(group.enrollmentId)}
                          >
                            <td
                              className="p-3 text-center"
                              onClick={e => {
                                e.stopPropagation();
                                if (pendingCycles.length === 0) return;
                                setSelectedPaymentIds(prev => {
                                  const next = { ...prev };
                                  if (isStudentAllSelected) {
                                    pendingCycles.forEach(c => delete next[c.id]);
                                  } else {
                                    pendingCycles.forEach(c => {
                                      next[c.id] = true;
                                    });
                                  }
                                  return next;
                                });
                              }}
                            >
                              {pendingCycles.length > 0 ? (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  title="Select all pending for this student"
                                >
                                  {isStudentAllSelected ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : isStudentPartiallySelected ? (
                                    <div className="w-4 h-4 rounded border border-primary bg-primary/20 flex items-center justify-center">
                                      <div className="w-2 h-2 bg-primary rounded-sm" />
                                    </div>
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              ) : null}
                            </td>
                            <td className="p-3 text-center text-muted-foreground">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-sm text-foreground">{group.student?.name}</p>
                              <p className="text-xs text-muted-foreground">{group.student?.enrollmentNo}</p>
                            </td>
                            <td className="p-3">
                              <p className="text-sm font-medium text-foreground">{group.student?.program?.name}</p>
                              <p className="text-xs text-muted-foreground">{group.student?.center?.name}</p>
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400 font-mono">
                              ₹{totalPendingAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>

                          {isExpanded &&
                            group.cycles.map(p => {
                              const isPending = p.status === 'pending';
                              const isSelected = !!selectedPaymentIds[p.id];

                              return (
                                <tr
                                  key={p.id}
                                  className={cn(
                                    'bg-muted/10 border-t border-border transition-colors',
                                    isSelected && 'bg-primary/10'
                                  )}
                                >
                                  <td className="p-3 text-center">
                                    {isPending ? (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          toggleSelectPayment(p.id);
                                        }}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="w-4 h-4 text-primary" />
                                        ) : (
                                          <Square className="w-4 h-4" />
                                        )}
                                      </button>
                                    ) : null}
                                  </td>
                                  <td></td>
                                  <td colSpan={2} className="p-3">
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline" className="font-medium">
                                        {p.semesterOrYear}
                                      </Badge>
                                      <span className="font-bold text-foreground font-mono">
                                        ₹{p.amount.toLocaleString('en-IN')}
                                      </span>
                                      {isSelected && (
                                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                                          Selected for batch
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    {p.status === 'paid' ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                          <CheckCircle className="w-4 h-4" /> Paid
                                          {p.paidAt && (
                                            <span className="text-xs text-muted-foreground font-normal ml-1">
                                              on {new Date(p.paidAt).toLocaleDateString('en-IN')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : p.status === 'locked' ? (
                                      <Button size="sm" variant="outline" disabled className="text-muted-foreground h-8 text-xs">
                                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Locked
                                      </Button>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant={isSelected ? 'secondary' : 'outline'}
                                          className="h-8 text-xs"
                                          onClick={() => toggleSelectPayment(p.id)}
                                        >
                                          {isSelected ? 'Deselect' : 'Select'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => handlePayClick(p)}
                                        >
                                          Pay Single
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── PAID / HISTORY TAB ───────────────────────────────────────── */}
        <TabsContent value="paid" className="space-y-4 mt-2">
          {/* View Mode Toggle Strip */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                History View:
              </span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setPaidViewMode('batches')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    paidViewMode === 'batches'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-500" /> By Consolidated Transaction / Batch
                </button>
                <button
                  type="button"
                  onClick={() => setPaidViewMode('students')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    paidViewMode === 'students'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className="w-3.5 h-3.5 text-purple-500" /> By Individual Student
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {paidViewMode === 'batches'
                ? 'Click on any transaction to see which students were paid through it.'
                : 'Expand any student to see installment details and transaction references.'}
            </p>
          </div>

          {/* VIEW MODE 1: BY BATCHES / TRANSACTIONS */}
          {paidViewMode === 'batches' ? (
            batchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No paid transactions or batches found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left p-3 font-semibold text-muted-foreground">UTR / Transaction Ref</th>
                        <th className="text-left p-3 font-semibold text-muted-foreground">Payment Date</th>
                        <th className="text-left p-3 font-semibold text-muted-foreground">University</th>
                        <th className="text-center p-3 font-semibold text-muted-foreground">Students Paid</th>
                        <th className="text-right p-3 font-semibold text-muted-foreground">Total Remitted</th>
                        <th className="text-center p-3 font-semibold text-muted-foreground">Proof</th>
                        <th className="text-right p-3 font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batches.map(batch => (
                        <tr
                          key={batch.key}
                          className="hover:bg-muted/20 transition-colors cursor-pointer group"
                          onClick={() => {
                            setBreakdownIdentifier(batch.key);
                            setBreakdownModalOpen(true);
                          }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                                  {batch.referenceNo || batch.batchId || 'N/A'}
                                </span>
                                {batch.batchId && batch.batchId !== batch.referenceNo && (
                                  <p className="text-[10px] font-mono text-muted-foreground">{batch.batchId}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {batch.paidAt
                              ? new Date(batch.paidAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-foreground truncate max-w-[200px] block">
                              {batch.universityName}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="font-semibold text-xs bg-muted/60 gap-1">
                              <Users className="w-3 h-3 text-primary" />
                              {batch.studentCount} Student{batch.studentCount > 1 ? 's' : ''}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                            ₹{batch.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            {batch.screenshot ? (
                              <a
                                href={`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${batch.screenshot}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                <FileText className="w-3.5 h-3.5" /> Proof
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                              onClick={e => {
                                e.stopPropagation();
                                setBreakdownIdentifier(batch.key);
                                setBreakdownModalOpen(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" /> View Students ({batch.studentCount})
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* VIEW MODE 2: BY INDIVIDUAL STUDENT (ACCORDION) */
            loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : groupedArray.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No paid university fee payments recorded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="w-10"></th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Program</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {groupedArray.map(group => {
                        const isExpanded = expandedStudents[group.student.id];
                        const paidCycles = group.cycles.filter(c => c.status === 'paid');
                        const totalAmount = paidCycles.reduce((sum, c) => sum + c.amount, 0);

                        return (
                          <React.Fragment key={group.student.id}>
                            <tr
                              className="hover:bg-muted/20 transition-colors cursor-pointer"
                              onClick={() => toggleStudent(group.student.id)}
                            >
                              <td className="p-3 text-center text-muted-foreground">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </td>
                              <td className="p-3">
                                <p className="font-medium text-sm text-foreground">{group.student?.name}</p>
                                <p className="text-xs text-muted-foreground">{group.student?.enrollmentNo}</p>
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-foreground">{group.student?.program?.name}</p>
                                <p className="text-xs text-muted-foreground">{group.student?.center?.name}</p>
                              </td>
                              <td className="p-3 text-right font-bold text-green-600 dark:text-green-400 font-mono">
                                ₹{totalAmount.toLocaleString('en-IN')}
                              </td>
                            </tr>
                            {isExpanded &&
                              paidCycles.map(p => (
                                <tr key={p.id} className="bg-muted/5 border-t border-border">
                                  <td></td>
                                  <td className="p-3">
                                    <Badge variant="outline">{p.semesterOrYear}</Badge>
                                    <span className="ml-3 font-medium text-green-600 dark:text-green-400 font-mono">
                                      ₹{p.amount.toLocaleString('en-IN')}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBreakdownIdentifier(p.batchId || p.referenceNo || p.id);
                                        setBreakdownModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-primary hover:underline"
                                      title="Click to view all students in this transaction"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>Ref: {p.referenceNo || p.batchId || 'N/A'}</span>
                                      <ExternalLink className="w-3 h-3 opacity-60" />
                                    </button>
                                    {p.paidAt && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Date: {new Date(p.paidAt).toLocaleDateString('en-IN')}
                                      </p>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {p.screenshot ? (
                                      <a
                                        href={`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${p.screenshot}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> View Proof
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </TabsContent>

        {/* ─── REPORT TAB ──────────────────────────────────────────────── */}
        <TabsContent value="report" className="space-y-4 mt-2">
          <FinanceUniversityFeeReportPanel />
        </TabsContent>
      </Tabs>

      {/* ─── DIALOG: BULK CONSOLIDATED PAYMENT TO UNIVERSITY ───────────── */}
      <Dialog open={bulkPayDialogOpen} onOpenChange={setBulkPayDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Single University Payment for Multiple Students
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record one university bank transfer (NEFT/RTGS/Challan) settling fees for {selectedCount} students.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Summary Banner */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Students Selected
                </span>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {selectedCount} Student{selectedCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Total Payable to University
                </span>
                <p className="text-2xl font-bold text-primary font-mono mt-0.5">
                  ₹{selectedTotalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Selected Students Preview Table */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Students Included in this Payment Manifest ({selectedCount})
              </Label>
              <div className="border border-border rounded-xl max-h-44 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Student Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Enrollment No</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Program</th>
                      <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Sem/Year</th>
                      <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Fee Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPaymentsList.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-medium text-foreground">{p.student?.name}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">{p.student?.enrollmentNo}</td>
                        <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">
                          {p.student?.program?.name}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {p.semesterOrYear}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-bold font-mono text-foreground">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-ref" className="text-xs font-semibold">
                  Transaction UTR / Reference No / Challan No <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bulk-ref"
                  placeholder="e.g. UTR9283741824 or CHAL-2026-091"
                  value={bulkForm.referenceNo}
                  onChange={e => setBulkForm({ ...bulkForm, referenceNo: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  This transaction reference will be permanently attached to each of the {selectedCount} students in payment history.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bulk-date" className="text-xs font-semibold">
                  Payment Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bulk-date"
                    type="date"
                    className="pl-9 text-sm"
                    value={bulkForm.paidAt}
                    onChange={e => setBulkForm({ ...bulkForm, paidAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Consolidated Payment Proof / Bank Slip (Optional)
                </Label>
                <Label
                  htmlFor="bulk-screenshot-upload"
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                    bulkForm.screenshot ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload
                      className={cn(
                        'w-7 h-7 mb-2',
                        bulkForm.screenshot ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {bulkForm.screenshot ? (
                        <span className="font-semibold text-foreground">{bulkForm.screenshot.name}</span>
                      ) : (
                        <span>
                          <span className="font-semibold text-foreground">Click to upload</span> bank remittance slip or UTR receipt
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, PDF (Max 5MB)</p>
                  </div>
                  <input
                    id="bulk-screenshot-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setBulkForm({ ...bulkForm, screenshot: e.target.files[0] });
                      }
                    }}
                  />
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-card flex justify-between items-center">
            <Button variant="outline" onClick={() => setBulkPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkPaySubmit}
              disabled={bulkSubmitting || !bulkForm.referenceNo.trim()}
              className="bg-primary hover:bg-primary/90 font-semibold"
            >
              {bulkSubmitting
                ? 'Processing Payment...'
                : `Confirm & Record Payment (₹${selectedTotalAmount.toLocaleString('en-IN')})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: SINGLE FEE PAYMENT ─────────────────────────────────── */}
      <Dialog open={payDialog.open} onOpenChange={o => !o && setPayDialog({ open: false, payment: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record University Fee Payment</DialogTitle>
          </DialogHeader>

          {payDialog.payment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-xl flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-foreground">{payDialog.payment.student.name}</p>
                  <p className="text-muted-foreground text-xs">{payDialog.payment.semesterOrYear}</p>
                </div>
                <p className="font-bold text-lg font-mono text-primary">
                  ₹{payDialog.payment.amount.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reference No / UTR</Label>
                <Input
                  value={form.referenceNo}
                  onChange={e => setForm({ ...form, referenceNo: e.target.value })}
                  placeholder="e.g. UTR123456"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={form.paidAt}
                    onChange={e => setForm({ ...form, paidAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Proof (Screenshot)</Label>
                <Label
                  htmlFor="screenshot-upload"
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                    form.screenshot ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload
                      className={cn(
                        'w-8 h-8 mb-3',
                        form.screenshot ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <p className="mb-2 text-sm text-muted-foreground">
                      {form.screenshot ? (
                        <span className="font-medium text-foreground">{form.screenshot.name}</span>
                      ) : (
                        <span>
                          <span className="font-semibold text-foreground">Click to upload</span> proof
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF (Max 2MB)</p>
                  </div>
                  <input
                    id="screenshot-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setForm({ ...form, screenshot: e.target.files[0] });
                      }
                    }}
                  />
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, payment: null })}>
              Cancel
            </Button>
            <Button onClick={handlePaySubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: TRANSACTION STUDENT BREAKDOWN ──────────────────────── */}
      <TransactionBreakdownModal
        identifier={breakdownIdentifier}
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
      />
    </div>
  );
}
