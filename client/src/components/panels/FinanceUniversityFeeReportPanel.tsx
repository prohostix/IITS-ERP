import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Landmark, RefreshCw, Download, Printer, Search, CheckCircle2, Clock,
  Lock, Building2, Layers, Eye, FileText, Image, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FinanceUniversityFeeReportPanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [universities, setUniversities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // Filter lists
  const [allUniversities, setAllUniversities] = useState<any[]>([]);
  const [allCenters, setAllCenters] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);

  // Active filters
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Screenshot / detail modal
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedUniversity, selectedCenter, selectedProgram, selectedStatus, dateFrom, dateTo]);

  const fetchFilterOptions = async () => {
    try {
      const [uRes, cRes, pRes] = await Promise.all([
        api.get('/operations/universities'),
        api.get('/operations/centers'),
        api.get('/operations/programs')
      ]);
      setAllUniversities(uRes.data.data || []);
      setAllCenters(cRes.data.data || []);
      setAllPrograms(pRes.data.data || []);
    } catch (_e) {}
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedUniversity && selectedUniversity !== 'all') q.append('universityId', selectedUniversity);
      if (selectedCenter && selectedCenter !== 'all') q.append('centerId', selectedCenter);
      if (selectedProgram && selectedProgram !== 'all') q.append('programId', selectedProgram);
      if (selectedStatus && selectedStatus !== 'all') q.append('status', selectedStatus);
      if (dateFrom) q.append('dateFrom', dateFrom);
      if (dateTo) q.append('dateTo', dateTo);
      if (search) q.append('search', search);

      const res = await api.get(`/finance/reports/university-fee-payments?${q.toString()}`);
      if (res.data.success) {
        setSummary(res.data.data.summary || {});
        setUniversities(res.data.data.universities || []);
        setPayments(res.data.data.payments || []);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch university fee payments report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error('No payments data to export');
      return;
    }

    const headers = [
      'Student Name', 'Enrollment No', 'Uni Roll No', 'University', 'Program',
      'Study Center', 'Semester/Year', 'Amount (INR)', 'Status', 'Paid Date', 'Reference No'
    ];

    const rows = payments.map(p => [
      `"${p.studentName || ''}"`,
      `"${p.enrollmentNo || ''}"`,
      `"${p.uniEnrollmentNumber || ''}"`,
      `"${p.universityName || ''}"`,
      `"${p.programName || ''}"`,
      `"${p.centerName || ''}"`,
      `"${p.semesterOrYear || ''}"`,
      p.amount || 0,
      `"${p.status || ''}"`,
      `"${p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '-'}"`,
      `"${p.referenceNo || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `University_Fee_Payment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">University Fee Payment Report</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Audit & Disbursement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track student university fee liabilities, disbursements, payment proofs, and outstanding balances per university.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Fees Payable</CardTitle>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{(summary.totalPayable || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.studentCount || 0} students across {summary.universitiesCount || 0} universities
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Paid to Universities</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{(summary.totalPaid || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {summary.completionRate || 0}% payment completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Pending Payable</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ₹{(summary.totalPending || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting remittance to university</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Installments</CardTitle>
            <Layers className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.recordsCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Semester & term fee obligations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px]">
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {allUniversities.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {allCenters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[160px]">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {allPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-[130px] text-xs h-9"
              />
              <span className="text-xs text-slate-500">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-[130px] text-xs h-9"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student, enrollment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchReport()}
              className="pl-8 text-xs h-9 bg-slate-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="university_summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="university_summary" className="gap-1.5">
            <Building2 className="w-4 h-4" /> University Summary ({universities.length})
          </TabsTrigger>
          <TabsTrigger value="detailed_payments" className="gap-1.5">
            <Layers className="w-4 h-4" /> Detailed Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: University Summary */}
        <TabsContent value="university_summary" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                University-Wise Payment Summary
              </CardTitle>
              <CardDescription>
                Summary of total fee obligations and disbursement status across partner universities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading university fee payments summary...</div>
              ) : universities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No records found for selected filters.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">University Name</th>
                        <th className="px-4 py-3 text-center">Students</th>
                        <th className="px-4 py-3 text-right">Total Payable</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                        <th className="px-4 py-3 text-right">Pending Due</th>
                        <th className="px-4 py-3 text-center">Paid Count</th>
                        <th className="px-4 py-3 text-center">Pending Count</th>
                        <th className="px-4 py-3 text-center">Payment Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {universities.map(u => (
                        <tr key={u.universityId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{u.universityName}</span>
                              {u.universityCode && u.universityCode !== 'N/A' && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                                  {u.universityCode}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                            {u.studentsCount}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                            ₹{u.totalPayable.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                            ₹{u.totalPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-amber-700">
                            ₹{u.pendingAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs text-emerald-700 font-medium">
                            {u.paidCount}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs text-amber-700 font-medium">
                            {u.pendingCount}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, u.paymentRate)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">{u.paymentRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 font-bold border-t text-xs text-slate-900">
                      <tr>
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-center">{summary.studentCount || 0}</td>
                        <td className="px-4 py-3 text-right">₹{(summary.totalPayable || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">₹{(summary.totalPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-amber-700">₹{(summary.totalPending || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">{summary.completionRate || 0}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Detailed Payments */}
        <TabsContent value="detailed_payments" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Student University Fee Payment Records
              </CardTitle>
              <CardDescription>
                Individual semester/year installment payment records showing payment status, UTR, and proof.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading university fee payments...</div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No payment records match the current filter selection.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">University & Program</th>
                        <th className="px-4 py-3 text-left">Study Center</th>
                        <th className="px-4 py-3 text-center">Semester / Year</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-left">Reference / UTR</th>
                        <th className="px-4 py-3 text-center">Paid Date</th>
                        <th className="px-4 py-3 text-center">Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>{item.studentName}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.enrollmentNo}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.universityName}</div>
                            <div className="text-xs text-slate-500">{item.programName}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.centerName}</div>
                            {item.centerCode && (
                              <span className="text-[10px] text-slate-400 font-mono">({item.centerCode})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="font-semibold text-xs text-slate-700 bg-slate-50">
                              {item.semesterOrYear}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="secondary"
                              className={
                                item.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 capitalize'
                                  : item.status === 'locked'
                                  ? 'bg-slate-100 text-slate-600 capitalize'
                                  : 'bg-amber-100 text-amber-800 capitalize'
                              }
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                            {item.referenceNo || '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {item.paidAt ? new Date(item.paidAt).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.screenshot ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedProof(item.screenshot)}
                                className="h-7 text-xs px-2 text-indigo-600 hover:text-indigo-800"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">University Payment Receipt Proof</DialogTitle>
            </DialogHeader>
            <div className="py-2 flex justify-center">
              <img
                src={selectedProof}
                alt="Payment Proof"
                className="max-h-[400px] w-auto rounded border object-contain shadow-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProof(null)}>Close</Button>
              <Button onClick={() => window.open(selectedProof, '_blank')} className="gap-1.5">
                <ExternalLink className="w-4 h-4" /> Open Full
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
