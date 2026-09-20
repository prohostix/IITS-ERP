import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function GradeExamModal({ submission, open, onOpenChange, onGraded }: any) {
  const [grades, setGrades] = useState<any[]>(
    submission?.answers?.map((ans: any) => ({
      questionId: ans.questionId,
      marksAwarded: ans.marksAwarded || 0,
      answerText: ans.answerText,
      questionText: submission.exam.questions?.find((q: any) => q.id === ans.questionId)?.questionText || 'Unknown Question',
      maxMarks: submission.exam.questions?.find((q: any) => q.id === ans.questionId)?.marks || 0
    })) || []
  );
  
  const [saving, setSaving] = useState(false);

  const handleGradeChange = (questionId: string, value: string) => {
    setGrades(grades.map(g => g.questionId === questionId ? { ...g, marksAwarded: value } : g));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post(`/operations/exams/submissions/${submission.id}/grade`, {
        grades: grades.map(g => ({
          questionId: g.questionId,
          marksAwarded: Number(g.marksAwarded)
        }))
      });
      toast.success('Exam graded successfully');
      onGraded();
    } catch (err) {
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Grade Exam: {submission?.student?.firstName} {submission?.student?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2 space-y-6">
          {grades.map((g, idx) => (
            <div key={g.questionId} className="p-4 bg-muted/50 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-foreground max-w-[80%]">
                  <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                  {g.questionText}
                </h4>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min="0" 
                    max={g.maxMarks} 
                    value={g.marksAwarded} 
                    onChange={(e) => handleGradeChange(g.questionId, e.target.value)}
                    className="w-20 text-center font-bold"
                  />
                  <span className="text-sm text-muted-foreground">/ {g.maxMarks}</span>
                </div>
              </div>
              <div className="p-3 bg-background border rounded-lg whitespace-pre-wrap text-sm">
                {g.answerText || <span className="text-muted-foreground italic">No answer provided</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Finalize Grade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
