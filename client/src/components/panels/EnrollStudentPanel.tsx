import { useState, useEffect } from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Program {
  id: string;
  name: string;
  code: string;
  universityId?: { name: string };
  feeStructure?: { baseFee: number; currency: string; additionalFees: { label: string; amount: number }[] };
}

interface WalletData {
  balance: number;
}

export function EnrollStudentPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [form, setForm] = useState({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes, walletRes] = await Promise.all([
        api.get('/enrollment/programs'),
        api.get('/enrollment/wallet'),
      ]);
      setPrograms(progsRes.data.data || []);
      setWallet(walletRes.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getTotalFee = (p: Program) => {
    if (!p.feeStructure) return 0;
    return p.feeStructure.baseFee + p.feeStructure.additionalFees.reduce((s, f) => s + f.amount, 0);
  };

  const handleEnroll = async () => {
    if (!selectedProgram) return;
    const missing = Object.entries(form).filter(([, v]) => !v.trim()).map(([k]) => k);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/enrollment/enroll', { ...form, programId: selectedProgram.id });
      toast.success('Enrollment submitted successfully');
      setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '' });
      setSelectedProgram(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const balance = wallet?.balance || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enroll a Student</h2>
          <p className="text-muted-foreground text-sm mt-1">Select a program and fill in student details to enroll.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Wallet Balance</p>
            <p className="text-lg font-bold text-primary">₹{balance.toLocaleString()}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Program</CardTitle>
            <CardDescription>Programs available for enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : programs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No programs available for enrollment.</p>
            ) : (
              <div className="space-y-3">
                {programs.map(p => {
                  const total = getTotalFee(p);
                  const canAfford = balance >= total;
                  const isSelected = selectedProgram?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProgram(isSelected ? null : p)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border transition-all',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        !canAfford && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.code} {p.universityId ? `• ${p.universityId.name}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₹{total.toLocaleString()}</p>
                          {!canAfford && <Badge variant="destructive" className="text-[9px]">Insufficient</Badge>}
                        </div>
                      </div>
                      {p.feeStructure && p.feeStructure.additionalFees.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {p.feeStructure.additionalFees.map((f, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{f.label}: ₹{f.amount}</Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>
              {selectedProgram
                ? `Enrolling in: ${selectedProgram.name} — Fee: ₹${getTotalFee(selectedProgram).toLocaleString()}`
                : 'Select a program first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Student full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="student@email.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.studentAddress} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Full address" />
            </div>
            <Button
              className="w-full mt-2"
              onClick={handleEnroll}
              disabled={!selectedProgram || submitting || (balance < getTotalFee(selectedProgram))}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              {submitting ? 'Enrolling...' : 'Enroll Student'}
            </Button>
            {selectedProgram && balance < getTotalFee(selectedProgram) && (
              <p className="text-xs text-destructive text-center">Insufficient wallet balance. Please top up first.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
