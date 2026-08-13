import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { OfferLetterDocument } from './OfferLetterDocument';

export function HiringPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const fetchRequests = async () => {
    try {
      const res = await api.get('/hiring/requests');
      setRequests(res.data.data || []);
      // extract candidates from requests
      const allCandidates = res.data.data.flatMap((req: any) => req.candidates || []);
      setCandidates(allCandidates);
    } catch (e: any) {
      toast.error('Failed to fetch hiring data');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateReqStatus = async (id: string, status: string) => {
    try {
      await api.put(`/hiring/requests/${id}/status`, { status });
      toast.success(`Hiring request updated to ${status}`);
      fetchRequests();
    } catch (e: any) {
      toast.error('Failed to update request');
    }
  };

  const handleUpdateCandidate = async (id: string, status: string, options: any = {}) => {
    try {
      await api.put(`/hiring/candidates/${id}/status`, { status, ...options });
      toast.success(`Candidate status updated to ${status}`);
      fetchRequests();
    } catch (e: any) {
      toast.error('Failed to update candidate');
    }
  };

  const requestColumns = [
    { key: 'title', header: 'Title' },
    { key: 'department', header: 'Department', render: (r: any) => r.department?.name || 'N/A' },
    { key: 'count', header: 'Count' },
    { key: 'status', header: 'Status', render: (r: any) => <Badge>{r.status.replace(/_/g, ' ')}</Badge> },
    { key: 'requester', header: 'Requested By', render: (r: any) => r.requester?.name || 'Unknown' },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (r: any) => (
        <div className="flex gap-2">
          {r.status === 'pending_hr_approval' && (
            <>
              <Button size="sm" onClick={() => handleUpdateReqStatus(r.id, 'approved')}>Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => handleUpdateReqStatus(r.id, 'rejected')}>Reject</Button>
            </>
          )}
        </div>
      ) 
    }
  ];

  const [pdfData, setPdfData] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const generatePDF = (candidate: any, type: 'offer' | 'appointment') => {
    // Standardize data for the template
    const templateData = {
      id: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      designation: candidate.hiringRequest?.title || 'Employee',
      department: candidate.hiringRequest?.department?.name || 'General',
      joiningDate: candidate.joinDate || new Date().toISOString(),
      salary: candidate.salary || 600000 // default for demo
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
             <Button size="sm" onClick={() => handleUpdateCandidate(r.id, 'joined')}>Mark Joined</Button>
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
          <TabsTrigger value="requests">Hiring Requests</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Requests</CardTitle>
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

      {/* Hidden PDF Container */}
      <div className="hidden">
        {pdfData && <OfferLetterDocument data={pdfData} />}
      </div>
    </div>
  );
}
