import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import { OfferLetterDocument } from './OfferLetterDocument';

export function HiringPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    hireImmediately: true,
    password: '',
    role: 'employee',
    joinDate: new Date().toISOString().slice(0, 10)
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/hiring/requests');
      const list = res.data.data || [];
      setRequests(list);
      const allCandidates = list.flatMap((req: any) =>
        (req.candidates || []).map((c: any) => ({ ...c, hiringRequest: req }))
      );
      setCandidates(allCandidates);
    } catch {
      toast.error('Failed to fetch hiring data');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateReqStatus = async (id: string, status: string) => {
    try {
      await api.put(`/hiring/requests/${id}/status`, { status });
      toast.success(
        status === 'approved'
          ? 'Hiring request approved! Open position slot added to Org Chart & Vacancies.'
          : `Hiring request ${status}`
      );
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update request');
    }
  };

  const handleUpdateCandidate = async (id: string, status: string, options: any = {}) => {
    try {
      await api.put(`/hiring/candidates/${id}/status`, { status, ...options });
      toast.success(
        status === 'joined'
          ? 'Candidate marked Joined! Employee created and assigned to Org Chart position.'
          : `Candidate status updated to ${status.replace(/_/g, ' ')}`
      );
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update candidate');
    }
  };

  const openAddCandidateDialog = (reqItem: any) => {
    setSelectedRequest(reqItem);
    setCandidateForm({
      name: '',
      email: '',
      phone: '',
      hireImmediately: true,
      password: '',
      role: 'employee',
      joinDate: new Date().toISOString().slice(0, 10)
    });
    setAddCandidateOpen(true);
  };

  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await api.post('/hiring/candidates', {
        hiringRequestId: selectedRequest.id,
        name: candidateForm.name,
        email: candidateForm.email,
        phone: candidateForm.phone,
        hireImmediately: candidateForm.hireImmediately,
        password: candidateForm.password || 'password123',
        role: candidateForm.role,
        joinDate: candidateForm.joinDate
      });
      toast.success(
        candidateForm.hireImmediately
          ? `${candidateForm.name} hired and assigned to ${selectedRequest.title} in the Org Chart!`
          : `Candidate ${candidateForm.name} added with Offer Sent status.`
      );
      setAddCandidateOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Approved • Open on Org Chart</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Fulfilled / Hired</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  const requestColumns = [
    { key: 'title', header: 'Position Title' },
    { key: 'department', header: 'Department', render: (r: any) => r.department?.name || 'N/A' },
    { key: 'count', header: 'Openings' },
    {
      key: 'hiredCount',
      header: 'Filled',
      render: (r: any) => {
        const joined = (r.candidates || []).filter((c: any) =>
          ['joined', 'appointment_sent', 'induction_pending', 'induction_completed', 'completed'].includes(c.status)
        ).length;
        return <span>{joined} / {r.count}</span>;
      }
    },
    { key: 'status', header: 'Status', render: (r: any) => statusBadge(r.status) },
    { key: 'requester', header: 'Requested By', render: (r: any) => r.requester?.name || 'Unknown' },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (r: any) => (
        <div className="flex gap-2">
          {r.status === 'pending_hr_approval' && (
            <>
              <Button size="sm" onClick={() => handleUpdateReqStatus(r.id, 'approved')}>Approve &amp; Open Slot</Button>
              <Button size="sm" variant="destructive" onClick={() => handleUpdateReqStatus(r.id, 'rejected')}>Reject</Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button size="sm" onClick={() => openAddCandidateDialog(r)}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add / Hire Candidate
            </Button>
          )}
        </div>
      ) 
    }
  ];

  const [pdfData, setPdfData] = useState<any>(null);
  const [_downloadingPdf, setDownloadingPdf] = useState(false);

  const generatePDF = (candidate: any, type: 'offer' | 'appointment') => {
    const templateData = {
      id: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      designation: candidate.hiringRequest?.title || 'Employee',
      department: candidate.hiringRequest?.department?.name || 'General',
      joiningDate: candidate.joinDate || new Date().toISOString(),
      salary: candidate.salary || 600000
    };

    setPdfData(templateData);
    setDownloadingPdf(true);

    setTimeout(() => {
      const element = document.getElementById(`offer-letter-${candidate.id}`);
      if (element) {
        html2pdf()
          .set({
            margin: 10,
            filename: `${type.charAt(0).toUpperCase() + type.slice(1)}_Letter_${candidate.name}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .from(element)
          .save()
          .then(() => setDownloadingPdf(false))
          .catch(() => {
            toast.error('Failed to generate PDF');
            setDownloadingPdf(false);
          });
      }
    }, 100);
  };

  const candidateColumns = [
    { key: 'name', header: 'Candidate Name' },
    { key: 'email', header: 'Email' },
    { key: 'position', header: 'Position', render: (r: any) => r.hiringRequest?.title || '-' },
    { key: 'status', header: 'Status', render: (r: any) => <Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge> },
    { 
      key: 'documents', 
      header: 'Documents', 
      render: (r: any) => (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => generatePDF(r, 'offer')}>Offer Letter</Button>
          {(r.status === 'joined' || r.status === 'appointment_sent' || r.status === 'induction_pending' || r.status === 'induction_completed') && (
            <Button size="sm" variant="outline" onClick={() => generatePDF(r, 'appointment')}>Appointment Letter</Button>
          )}
        </div>
      ) 
    },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (r: any) => (
        <div className="flex gap-2 flex-wrap">
          {r.status === 'offer_sent' && (
             <Button size="sm" onClick={() => handleUpdateCandidate(r.id, 'joined')}>Mark Joined &amp; Assign Slot</Button>
          )}
          {r.status === 'joined' && (
             <Button size="sm" onClick={() => handleUpdateCandidate(r.id, 'appointment_sent')}>Send Appointment</Button>
          )}
          {r.status === 'appointment_sent' && (
             <Button size="sm" onClick={() => handleUpdateCandidate(r.id, 'induction_pending')}>Schedule Induction</Button>
          )}
          {r.status === 'induction_pending' && (
             <Button size="sm" onClick={() => handleUpdateCandidate(r.id, 'induction_completed')}>Complete Induction</Button>
          )}
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Hiring Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Requests</CardTitle>
              <CardDescription className="text-xs">
                Approving a hiring request automatically opens a position slot in the Org Chart and creates an open Vacancy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={requestColumns} data={requests} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={candidateColumns} data={candidates} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Hire Candidate Dialog */}
      <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add / Hire Candidate for: {selectedRequest?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCandidateSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={candidateForm.hireImmediately ? 'default' : 'outline'}
                onClick={() => setCandidateForm(prev => ({ ...prev, hireImmediately: true }))}
                className="flex-1"
              >
                Hire &amp; Onboard Immediately
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!candidateForm.hireImmediately ? 'default' : 'outline'}
                onClick={() => setCandidateForm(prev => ({ ...prev, hireImmediately: false }))}
                className="flex-1"
              >
                Send Offer First
              </Button>
            </div>

            <div>
              <Label>Full Name</Label>
              <Input
                required
                placeholder="Candidate full name"
                value={candidateForm.name}
                onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  placeholder="employee@company.com"
                  value={candidateForm.email}
                  onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={candidateForm.phone}
                  onChange={e => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                />
              </div>
            </div>

            {candidateForm.hireImmediately && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Initial Password</Label>
                    <Input
                      type="password"
                      placeholder="Default: password123"
                      value={candidateForm.password}
                      onChange={e => setCandidateForm({ ...candidateForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>System Role</Label>
                    <Select
                      value={candidateForm.role}
                      onValueChange={v => setCandidateForm({ ...candidateForm, role: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="bde">BDE</SelectItem>
                        <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                        <SelectItem value="sales_admin">Sales Admin</SelectItem>
                        <SelectItem value="ops_sub_admin">Ops Sub Admin</SelectItem>
                        <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                        <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                        <SelectItem value="front_office_admin">Front Office Admin</SelectItem>
                        <SelectItem value="branch_manager">Branch Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                  This candidate will immediately receive an active user account, fill the open <strong>{selectedRequest?.title}</strong> slot in the Org Chart, and report to the parent designation holder.
                </p>
              </>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving...' : candidateForm.hireImmediately ? 'Create User & Assign to Org Chart' : 'Add Candidate (Offer Sent)'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAddCandidateOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden PDF Container */}
      <div className="hidden">
        {pdfData && <OfferLetterDocument data={pdfData} />}
      </div>
    </div>
  );
}
