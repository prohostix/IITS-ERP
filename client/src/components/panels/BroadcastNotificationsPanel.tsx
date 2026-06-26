import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function BroadcastNotificationsPanel() {
  const { user } = useAuth();
  const isFinance = ['finance_admin', 'finance'].includes(user?.role || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lists for dropdowns
  const [students, setStudents] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    target: isFinance ? 'centers' : 'students', // default targets
    targetId: '',
    title: '',
    message: '',
    priority: 'medium',
    link: ''
  });

  useEffect(() => {
    fetchTargetLists();
  }, []);

  // Update target default if role changes
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      target: isFinance ? 'centers' : 'students',
      targetId: ''
    }));
  }, [user]);

  const fetchTargetLists = async () => {
    setLoading(true);
    try {
      const centersRes = await api.get('/operations/centers');
      setCenters(centersRes.data.data || []);

      if (!isFinance) {
        const studentsRes = await api.get('/students');
        setStudents(studentsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load targeting details:', error);
      toast.error('Failed to load recipient selection lists');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (val: string) => {
    setForm({
      ...form,
      target: val,
      targetId: '',
      title: val === 'centers' && isFinance ? 'Pending Fee Notification' : form.title
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Please enter a title and message');
      return;
    }
    if (['student', 'center'].includes(form.target) && !form.targetId) {
      toast.error('Please select a specific recipient');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/notifications/broadcast', {
        target: form.target,
        targetId: form.targetId || undefined,
        title: form.title,
        message: form.message,
        priority: form.priority,
        link: form.link || undefined
      });
      toast.success('Notification broadcasted successfully');
      setForm(prev => ({
        ...prev,
        title: '',
        message: '',
        targetId: '',
        link: ''
      }));
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Send Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Compose and broadcast system and exam notifications to students and study centers.
        </p>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span>Compose Notification</span>
          </CardTitle>
          <CardDescription>
            {isFinance 
              ? 'Select targeted study centers and compose fee pending warnings.' 
              : 'Select target group and compose notifications or exam circulars.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Type */}
                <div className="space-y-1">
                  <Label>Recipient Target</Label>
                  <Select value={form.target} onValueChange={handleTargetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target group" />
                    </SelectTrigger>
                    <SelectContent>
                      {!isFinance && <SelectItem value="students">All Students</SelectItem>}
                      {!isFinance && <SelectItem value="student">Specific Student</SelectItem>}
                      <SelectItem value="centers">All Study Centers</SelectItem>
                      <SelectItem value="center">Specific Study Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Specific Recipient Selection */}
                {['student', 'center'].includes(form.target) && (
                  <div className="space-y-1">
                    <Label>{form.target === 'student' ? 'Select Student' : 'Select Study Center'}</Label>
                    <Select value={form.targetId} onValueChange={(val) => setForm({ ...form, targetId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder={form.target === 'student' ? 'Choose a student' : 'Choose a center'} />
                      </SelectTrigger>
                      <SelectContent>
                        {form.target === 'student'
                          ? students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</SelectItem>)
                          : centers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Notification Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High / Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Redirect Link (Optional) */}
                <div className="space-y-1">
                  <Label>Redirect Link (Optional)</Label>
                  <Input 
                    value={form.link} 
                    onChange={e => setForm({ ...form, link: e.target.value })} 
                    placeholder="e.g. exams, invoices, student-applications"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <Label>Notification Title</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder={form.target.includes('student') ? 'Exam notification' : 'Important Announcement'} 
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <Label>Message Content</Label>
                <Textarea 
                  value={form.message} 
                  onChange={e => setForm({ ...form, message: e.target.value })} 
                  placeholder="Type the message body here..." 
                  className="min-h-[120px]"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
