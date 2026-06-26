import { useState, useEffect } from 'react';
import { RefreshCw, FileText, GraduationCap, Eye, Calendar, User, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentAddress: string;
  programId: { name: string; code: string } | string;
  program?: { name: string; code: string; university?: { name: string } };
  session?: { name: string };
  status: string;
  createdAt: string;
  documents?: { name: string; url: string }[] | null;
  educationalDetails?: { qualification: string; institution: string; passingYear: string; percentage?: string }[] | null;
}

const STATUS_COLOR: Record<string, string> = {
  payment_pending: 'bg-muted text-muted-foreground',
  document_review: 'bg-info/10 text-info',
  dept_review: 'bg-warning/10 text-warning',
  finance_review: 'bg-orange-100 text-orange-700',
  enrolled: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function StudyCenterEnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/enrollment/enrollments${params}`);
      setEnrollments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const getProgramName = (e: Enrollment) => {
    if (e.program && e.program.name) {
      return `${e.program.name} (${e.program.code})`;
    }
    return typeof e.programId === 'object' ? `${e.programId.name} (${e.programId.code})` : e.programId;
  };

  const getUniversityName = (e: Enrollment) => {
    return e.program?.university?.name || '';
  };

  const STATUSES = ['', 'document_review', 'dept_review', 'finance_review', 'enrolled', 'rejected'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1">Track all student enrollments submitted by your center.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'
            )}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No enrollments found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => (
            <Card key={e.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[e.status] || 'bg-muted text-muted-foreground')}>
                      {e.status.replace(/_/g, ' ')}
                    </Badge>
                    {e.enrollmentNumber && <span className="text-xs text-muted-foreground">{e.enrollmentNumber}</span>}
                  </div>
                  <h4 className="font-semibold">{e.studentName}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>{e.studentEmail}</span>
                    <span>{e.studentPhone}</span>
                    <span>{getProgramName(e)}</span>
                    {getUniversityName(e) && <span>{getUniversityName(e)}</span>}
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedEnrollment(e)}>
                  <Eye className="w-4 h-4 mr-1.5" /> View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enrollment Details Dialog */}
      <Dialog open={!!selectedEnrollment} onOpenChange={o => { if(!o) setSelectedEnrollment(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedEnrollment && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl">Application Details</DialogTitle>
                  <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[selectedEnrollment.status] || 'bg-muted text-muted-foreground')}>
                    {selectedEnrollment.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-3">
                {/* Basic Details */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Student Name</p>
                      <p className="font-medium">{selectedEnrollment.studentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Email</p>
                      <p className="font-medium">{selectedEnrollment.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Phone</p>
                      <p className="font-medium">{selectedEnrollment.studentPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Address</p>
                      <p className="font-medium">{selectedEnrollment.studentAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Course Details */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" /> Program Selection & Intake Session
                  </h4>
                  <div className="bg-muted/20 p-4 rounded-xl border text-sm space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Program Name</span>
                      <span className="font-semibold text-foreground">{getProgramName(selectedEnrollment)}</span>
                    </div>
                    {getUniversityName(selectedEnrollment) && (
                      <div>
                        <span className="text-xs text-muted-foreground block font-medium">University</span>
                        <span className="font-semibold text-foreground">{getUniversityName(selectedEnrollment)}</span>
                      </div>
                    )}
                    {selectedEnrollment.session?.name && (
                      <div>
                        <span className="text-xs text-muted-foreground block font-medium">Intake Session</span>
                        <span className="font-semibold text-foreground">{selectedEnrollment.session.name}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Submitted on: {new Date(selectedEnrollment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Educational Details */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" /> Educational History
                  </h4>
                  {selectedEnrollment.educationalDetails && selectedEnrollment.educationalDetails.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEnrollment.educationalDetails.map((edu, idx) => (
                        <div key={idx} className="bg-muted/10 p-3 rounded-lg border text-sm grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <span className="text-xs text-muted-foreground block">Qualification</span>
                            <span className="font-semibold">{edu.qualification}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground block">Institution</span>
                            <span className="font-medium">{edu.institution}</span>
                          </div>
                          <div className="col-span-1 text-right">
                            <span className="text-xs text-muted-foreground block">Passing / %</span>
                            <span className="font-medium">{edu.passingYear} {edu.percentage ? `· ${edu.percentage}%` : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg border">No educational credentials added.</p>
                  )}
                </div>

                {/* Uploaded Documents */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" /> Uploaded Documents
                  </h4>
                  {selectedEnrollment.documents && selectedEnrollment.documents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedEnrollment.documents.map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-muted/10 p-2.5 rounded-lg border text-sm">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium">{doc.name}</span>
                          </div>
                          <a
                            href={doc.url.startsWith('/') ? doc.url : `/uploads/${doc.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline font-semibold flex-shrink-0"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg border">No documents uploaded.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
