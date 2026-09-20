import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import GradeExamModal from './GradeExamModal';

export default function ExamSubmissionsModal({ examId, open, onOpenChange, examType }: any) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/operations/exams/${examId}/submissions`);
      setSubmissions(res.data.submissions);
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && examId) {
      fetchSubmissions();
    }
  }, [open, examId]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Exam Submissions</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No submissions yet.</p>
              </div>
            ) : (
              <div className="border rounded-xl divide-y overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Enrollment No</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {sub.student.firstName} {sub.student.lastName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {sub.student.enrollmentNo || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            sub.status === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            sub.status === 'submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                            {sub.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {sub.score !== null ? sub.score : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {examType === 'subjective' && sub.status === 'submitted' && (
                            <Button size="sm" onClick={() => setGradingSubmission(sub)}>
                              Grade
                            </Button>
                          )}
                          {sub.status === 'graded' && (
                            <span className="text-green-600 dark:text-green-400 flex items-center justify-end text-sm font-medium">
                              <CheckCircle className="w-4 h-4 mr-1" /> Graded
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {gradingSubmission && (
        <GradeExamModal
          submission={gradingSubmission}
          open={!!gradingSubmission}
          onOpenChange={(op: boolean) => {
            if (!op) setGradingSubmission(null);
          }}
          onGraded={() => {
            setGradingSubmission(null);
            fetchSubmissions();
          }}
        />
      )}
    </>
  );
}
