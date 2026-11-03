import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, IndianRupee, BookOpen, GraduationCap, Building2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import api from '@/lib/api';
import { toast } from 'sonner';

interface ProgramFee {
  id: string;
  level: string; // "program" or "university"
  programId?: { id: string; name: string; code: string; universityId: any;
  duration?: number; specialisations?: any } | string | null;
  universityId?: { id: string; name: string } | string | null;
  admissionSessionId?: { id: string; name: string } | string | null;
  baseFee: number;
  fullProgramFee?: number;
  oneTimeUniversityFee?: number;
  oneTimeCommission?: number;
  additionalFees: { label: string; amount: number }[];
  feeBreakdown?: any[];
  currency: string;
  effectiveFrom: string;
  billingCycle?: string;
  examFee?: number;
  gstPercentage?: number;
  universityFee?: number;
  commissionRate?: number;
  specialisation?: string | null;
}

interface University {
  id: string;
  name: string;
  code?: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
  universityId: any;
  duration?: number;
  specialisations?: string[];
}

interface AdmissionSession {
  id: string;
  name: string;
}

export function ProgramFeeStructurePanel() {
  const [fees, setFees] = useState<ProgramFee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramFee | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>('list');
  const [wizardStep, setWizardStep] = useState(1);
  
  // Unused program creation logic removed as per new UI flow

  const [form, setForm] = useState({ 
    level: 'program',
    programId: '', 
    universityId: '',
    admissionSessionId: '',
    specialisation: '',
    billingCycle: 'both', 
    currency: 'INR', 
    effectiveFrom: '', 
    additionalFees: [] as { id: string; label: string; amount: string }[],
    enableOneTime: true,
    enableYearly: true,
    enableSemester: true,
    yearlyBreakdown: [] as any[],
    semesterBreakdown: [] as any[],
    baseFee: '0',
    universityFee: '0',
    fullProgramFee: '0',
    oneTimeFee: '0',
    oneTimeUniversityFee: '0',
    oneTimeCommission: '0',
  });

  useEffect(() => {
    let dur = 36; // Default to 3 years
    
    if (form.level === 'program') {
       if (!form.programId) return;
       const prog = programs.find(p => p.id === form.programId);
       if (prog) dur = prog.duration || 36;
    }

    const numYears = Math.max(1, Math.floor(dur / 12));
    const numSemesters = Math.max(1, Math.floor(dur / 6));
    
    setForm(prev => {
       let updated = false;
       const newYearly = [...prev.yearlyBreakdown];
       while (newYearly.length < numYears) {
         newYearly.push({
           installmentType: 'year',
           year: newYearly.length + 1,
           baseFee: '0',
           universityFee: '0',
           examFee: '0',
           commissionRate: '0',
           dueDate: '',
           additionalFees: [] as { id: string; label: string; amount: string }[]
         });
         updated = true;
       }
       if (newYearly.length > numYears) {
         newYearly.length = numYears;
         updated = true;
       }

       const newSemester = [...prev.semesterBreakdown];
       while (newSemester.length < numSemesters) {
         newSemester.push({
           installmentType: 'semester',
           year: newSemester.length + 1,
           semester: newSemester.length + 1,
           baseFee: '0',
           universityFee: '0',
           examFee: '0',
           commissionRate: '0',
           dueDate: '',
           additionalFees: [] as { id: string; label: string; amount: string }[]
         });
         updated = true;
       }
       if (newSemester.length > numSemesters) {
         newSemester.length = numSemesters;
         updated = true;
       }

       if (updated) {
         return {
           ...prev,
           yearlyBreakdown: newYearly,
           semesterBreakdown: newSemester
         };
       }
       return prev;
    });
  }, [form.programId, programs, form.level]);

  const addAdditionalFee = () => {
    setForm(prev => ({
      ...prev,
      additionalFees: [...prev.additionalFees, { id: Date.now().toString(), label: '', amount: '' }]
    }));
  };

  const removeAdditionalFee = (idx: number) => {
    setForm(prev => {
      const newFees = [...prev.additionalFees];
      newFees.splice(idx, 1);
      return { ...prev, additionalFees: newFees };
    });
  };

  const handleAdditionalFeeChange = (idx: number, field: string, value: string) => {
    setForm(prev => {
      const newFees = [...prev.additionalFees];
      newFees[idx] = { ...newFees[idx], [field]: value };
      return { ...prev, additionalFees: newFees };
    });
  };

  // Yearly installment handlers
  const handleYearlyBreakdownChange = (idx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.yearlyBreakdown];
      newBreakdown[idx] = { ...newBreakdown[idx], [field]: value };
      return { ...prev, yearlyBreakdown: newBreakdown };
    });
  };

  const addYearlyBreakdownAdditionalFee = (bIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.yearlyBreakdown];
      const fees = Array.isArray(newBreakdown[bIdx].additionalFees) ? [...newBreakdown[bIdx].additionalFees] : [];
      fees.push({ id: Date.now().toString(), label: '', amount: '' });
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, yearlyBreakdown: newBreakdown };
    });
  };

  const removeYearlyBreakdownAdditionalFee = (bIdx: number, fIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.yearlyBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees.splice(fIdx, 1);
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, yearlyBreakdown: newBreakdown };
    });
  };

  const handleYearlyBreakdownAdditionalFeeChange = (bIdx: number, fIdx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.yearlyBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees[fIdx] = { ...fees[fIdx], [field]: value };
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, yearlyBreakdown: newBreakdown };
    });
  };

  // Semester installment handlers
  const handleSemesterBreakdownChange = (idx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.semesterBreakdown];
      newBreakdown[idx] = { ...newBreakdown[idx], [field]: value };
      return { ...prev, semesterBreakdown: newBreakdown };
    });
  };

  const addSemesterBreakdownAdditionalFee = (bIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.semesterBreakdown];
      const fees = Array.isArray(newBreakdown[bIdx].additionalFees) ? [...newBreakdown[bIdx].additionalFees] : [];
      fees.push({ id: Date.now().toString(), label: '', amount: '' });
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, semesterBreakdown: newBreakdown };
    });
  };

  const removeSemesterBreakdownAdditionalFee = (bIdx: number, fIdx: number) => {
    setForm(prev => {
      const newBreakdown = [...prev.semesterBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees.splice(fIdx, 1);
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, semesterBreakdown: newBreakdown };
    });
  };

  const handleSemesterBreakdownAdditionalFeeChange = (bIdx: number, fIdx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.semesterBreakdown];
      const fees = [...newBreakdown[bIdx].additionalFees];
      fees[fIdx] = { ...fees[fIdx], [field]: value };
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], additionalFees: fees };
      return { ...prev, semesterBreakdown: newBreakdown };
    });
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [feesRes, progsRes, unisRes, sessionsRes] = await Promise.all([
        api.get('/finance/program-fees'),
        api.get('/operations/programs'),
        api.get('/operations/universities'),
        api.get('/operations/sessions').catch(() => ({ data: { data: [] } })),
      ]);
      setFees(feesRes.data.data || []);
      setPrograms(progsRes.data.data || []);
      setUniversities(unisRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
      
      const unis = unisRes.data.data || [];
      if (unis.length > 0 && !selectedUniversityId) {
        // We will leave it unselected to force user to click
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedUniversityId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetForm = () => {
    setEditing(null);
    setForm({ 
      level: 'program',
      programId: selectedProgramId, 
      universityId: selectedUniversityId,
      admissionSessionId: '',
      specialisation: '',
      billingCycle: 'both', 
      currency: 'INR', 
      effectiveFrom: '', 
      additionalFees: [] as { id: string; label: string; amount: string }[],
      enableOneTime: true,
      enableYearly: true,
      enableSemester: true,
      yearlyBreakdown: [],
      semesterBreakdown: [],
      baseFee: '0',
      universityFee: '0',
      fullProgramFee: '0',
      oneTimeFee: '0',
      oneTimeUniversityFee: '0',
      oneTimeCommission: '0',
    });
    setWizardStep(1);
  };

  const openEdit = (fee: ProgramFee) => {
    setEditing(fee);
    setViewMode('wizard');
    setWizardStep(4);
    
    const progId = typeof fee.programId === 'object' ? fee.programId?.id : fee.programId;
    const uniId = typeof fee.universityId === 'object' ? fee.universityId?.id : fee.universityId;
    const sessId = typeof fee.admissionSessionId === 'object' ? fee.admissionSessionId?.id : fee.admissionSessionId;

    let parsedBreakdown = fee.feeBreakdown || [];
    if (typeof parsedBreakdown === 'string') {
      try { parsedBreakdown = JSON.parse(parsedBreakdown); } catch (e) { parsedBreakdown = []; }
    }

    let yearly: any[] = [];
    let semester: any[] = [];

    if (Array.isArray(parsedBreakdown) && parsedBreakdown.length > 0) {
      const normalized = parsedBreakdown.map((b: any) => ({
        installmentType: b.installmentType,
        year: b.year || b.semester || 1,
        semester: b.semester || b.year || 1,
        baseFee: String(b.baseFee || '0'),
        universityFee: String(b.universityFee || '0'),
        examFee: String(b.examFee || '0'),
        commissionRate: String(b.commissionRate || '0'),
        dueDate: b.dueDate || '',
        additionalFees: Array.isArray(b.additionalFees) ? b.additionalFees.map((f: any, i: number) => ({ id: Date.now().toString() + i, label: f.label, amount: String(f.amount) })) : []
      }));

      const hasTagged = normalized.some(b => b.installmentType === 'year' || b.installmentType === 'semester');
      if (hasTagged) {
        yearly = normalized.filter(b => b.installmentType === 'year');
        semester = normalized.filter(b => b.installmentType === 'semester');
      } else {
        if (fee.billingCycle === 'per_semester') {
          semester = normalized.map(b => ({ ...b, installmentType: 'semester' }));
        } else {
          yearly = normalized.map(b => ({ ...b, installmentType: 'year' }));
        }
      }
    }

    const oneTimeFeeObj = fee.additionalFees?.find(f => f.label.toLowerCase() === 'one time payment' || f.label.toLowerCase() === 'registration fee' || f.label.toLowerCase() === 'admission fee');
    const filteredOtherFees = fee.additionalFees?.filter(f => f !== oneTimeFeeObj) || [];

    const hasOneTime = Number(fee.fullProgramFee || 0) > 0 || fee.billingCycle === 'one_time' || Number(fee.oneTimeUniversityFee || 0) > 0;
    const hasYearly = fee.billingCycle === 'both' || fee.billingCycle === 'per_year' || fee.billingCycle === 'yearly' || yearly.length > 0;
    const hasSemester = fee.billingCycle === 'both' || fee.billingCycle === 'per_semester' || semester.length > 0;

    // Pre-fill empty blocks for any mode not yet configured so toggling it on shows editable rows
    const editProg = programs.find(p => p.id === progId);
    const editDur = (editProg as any)?.duration || 36;
    const makeBlock = (type: 'year' | 'semester', n: number) => ({
      installmentType: type,
      year: n,
      semester: n,
      baseFee: '0',
      universityFee: '0',
      examFee: '0',
      commissionRate: '0',
      dueDate: '',
      additionalFees: [] as { id: string; label: string; amount: string }[]
    });
    if (yearly.length === 0) {
      const n = Math.max(1, Math.floor(editDur / 12));
      yearly = Array.from({ length: n }, (_, i) => makeBlock('year', i + 1));
    }
    if (semester.length === 0) {
      const n = Math.max(1, Math.floor(editDur / 6));
      semester = Array.from({ length: n }, (_, i) => makeBlock('semester', i + 1));
    }

    setForm({
      level: fee.level || 'program',
      programId: progId || '',
      universityId: uniId || '',
      admissionSessionId: sessId || '',
      specialisation: fee.specialisation || '',
      billingCycle: fee.billingCycle || 'both',
      currency: fee.currency || 'INR',
      effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.slice(0, 10) : '',
      enableOneTime: hasOneTime || (!hasYearly && !hasSemester),
      enableYearly: hasYearly,
      enableSemester: hasSemester,
      yearlyBreakdown: yearly,
      semesterBreakdown: semester,
      baseFee: String(fee.baseFee || '0'),
      fullProgramFee: String(fee.fullProgramFee || '0'),
      oneTimeFee: String(oneTimeFeeObj ? oneTimeFeeObj.amount : '0'),
      oneTimeUniversityFee: String(fee.oneTimeUniversityFee || '0'),
      oneTimeCommission: String(fee.oneTimeCommission || '0'),
      additionalFees: filteredOtherFees.map((f: any, i: number) => ({ id: Date.now().toString() + i, label: f.label, amount: String(f.amount) })),
    });
    setOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (form.level === 'program' && !form.programId) {
        toast.error('Please select a program');
        return;
      }
      if (form.level === 'university' && !form.universityId) {
        toast.error('Please select a university');
        return;
      }

      if (!form.enableOneTime && !form.enableYearly && !form.enableSemester) {
        toast.error('Please enable at least one payment mode (One-Time, Yearly, or Semester)');
        return;
      }

      if (form.enableOneTime && Number(form.fullProgramFee || 0) <= 0) {
        toast.error('Please specify a valid full program payment amount for One-Time payment');
        return;
      }

      const addFees = [];
      if (form.enableOneTime && Number(form.oneTimeFee) > 0) {
        addFees.push({ label: 'One Time Payment', amount: Number(form.oneTimeFee) });
      }
      if (form.additionalFees && form.additionalFees.length > 0) {
        const custom = form.additionalFees.filter(f => f.label.trim() && !isNaN(Number(f.amount))).map(f => ({ label: f.label.trim(), amount: Number(f.amount) }));
        addFees.push(...custom);
      }
      
      const cleanBreakdown: any[] = [];
      let totalBaseFee = 0;
      let totalUniversityFee = 0;
      let aggregatedCommissionRate = 0;

      if (form.enableYearly) {
        form.yearlyBreakdown.forEach((b, idx) => {
          totalBaseFee += Number(b.baseFee || 0);
          totalUniversityFee += Number(b.universityFee || 0);
          if (Number(b.commissionRate || 0) > 0 && aggregatedCommissionRate === 0) aggregatedCommissionRate = Number(b.commissionRate);
          cleanBreakdown.push({
            installmentType: 'year',
            year: idx + 1,
            baseFee: Number(b.baseFee || 0),
            universityFee: Number(b.universityFee || 0),
            examFee: Number(b.examFee || 0),
            commissionRate: Number(b.commissionRate || 0),
            dueDate: b.dueDate || '',
            additionalFees: Array.isArray(b.additionalFees) ? b.additionalFees.filter((f: any) => f.label.trim() && !isNaN(Number(f.amount))).map((f: any) => ({ label: f.label.trim(), amount: Number(f.amount) })) : []
          });
        });
      }

      if (form.enableSemester) {
        form.semesterBreakdown.forEach((b, idx) => {
          if (!form.enableYearly) {
            totalBaseFee += Number(b.baseFee || 0);
            totalUniversityFee += Number(b.universityFee || 0);
          }
          if (Number(b.commissionRate || 0) > 0 && aggregatedCommissionRate === 0) aggregatedCommissionRate = Number(b.commissionRate);
          cleanBreakdown.push({
            installmentType: 'semester',
            year: idx + 1,
            semester: idx + 1,
            baseFee: Number(b.baseFee || 0),
            universityFee: Number(b.universityFee || 0),
            examFee: Number(b.examFee || 0),
            commissionRate: Number(b.commissionRate || 0),
            dueDate: b.dueDate || '',
            additionalFees: Array.isArray(b.additionalFees) ? b.additionalFees.filter((f: any) => f.label.trim() && !isNaN(Number(f.amount))).map((f: any) => ({ label: f.label.trim(), amount: Number(f.amount) })) : []
          });
        });
      }

      const cycle = form.enableYearly && form.enableSemester
        ? 'both'
        : form.enableYearly
        ? 'per_year'
        : form.enableSemester
        ? 'per_semester'
        : 'one_time';

      const cleanSessionId = !form.admissionSessionId || form.admissionSessionId === '__none__' || form.admissionSessionId === 'none' ? null : form.admissionSessionId;
      const cleanUniId = !form.universityId || form.universityId === '__none__' ? null : form.universityId;
      const cleanProgId = form.level === 'program' && form.programId && form.programId !== '__none__' ? form.programId : null;
      const cleanSpec = !form.specialisation || form.specialisation === '__none__' ? null : form.specialisation;

      const payload = {
        level: form.level,
        programId: cleanProgId,
        universityId: cleanUniId,
        admissionSessionId: cleanSessionId,
        specialisation: cleanSpec,
        baseFee: totalBaseFee > 0 ? totalBaseFee : Number(form.fullProgramFee || 0),
        fullProgramFee: form.enableOneTime ? Number(form.fullProgramFee || 0) : 0,
        oneTimeUniversityFee: form.enableOneTime ? Number(form.oneTimeUniversityFee || 0) : 0,
        oneTimeCommission: form.enableOneTime ? Number(form.oneTimeCommission || 0) : 0,
        universityFee: totalUniversityFee > 0 ? totalUniversityFee : (form.enableOneTime ? Number(form.oneTimeUniversityFee || 0) : 0),
        billingCycle: cycle,
        currency: form.currency,
        effectiveFrom: form.effectiveFrom || "",
        additionalFees: addFees,
        feeBreakdown: cleanBreakdown,
        commissionRate: aggregatedCommissionRate,
      };

      if (editing) {
        await api.put(`/finance/program-fees/${editing.id}`, payload);
        toast.success('Fee structure updated');
      } else {
        await api.post('/finance/program-fees', payload);
        toast.success('Fee structure created');
      }
      setOpen(false);
      setViewMode('list');
      fetchAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await api.delete(`/finance/program-fees/${id}`);
      toast.success('Deleted');
      fetchAllData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  // Program creation handlers removed as per new UI flow
  // Filter programs based on selected university
  const filteredPrograms = useMemo(() => {
    if (!selectedUniversityId) return [];
    return programs.filter(p => {
      const uId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
      return uId === selectedUniversityId;
    });
  }, [programs, selectedUniversityId]);

  const filteredFees = useMemo(() => {
    let result = fees;
    if (selectedUniversityId) {
      result = result.filter(f => {
         const uId = typeof f.universityId === 'object' ? f.universityId?.id : f.universityId;
         return uId === selectedUniversityId;
      });
    }
    if (selectedProgramId) {
      result = result.filter(f => {
         const pId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
         return pId === selectedProgramId;
      });
    }
    return result;
  }, [fees, selectedUniversityId, selectedProgramId]);

  // Filter programs based on selected university in the dialog form
  const dialogFilteredPrograms = programs.filter(p => {
    const pUniId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
    return !form.universityId || pUniId === form.universityId;
  });



  const getProgramName = (fee: ProgramFee) => {
    if (fee.level === 'university') {
      const uni = typeof fee.universityId === 'object' ? fee.universityId : universities.find(u => u.id === fee.universityId);
      return uni ? `${uni.name} (University Level)` : 'Unknown University';
    }
    const prog = typeof fee.programId === 'object' ? fee.programId : programs.find(p => p.id === fee.programId);
    return prog ? `${prog.name} (${prog.code})` : 'Unknown Program';
  };

  const getProgramSpecialisations = (fee: ProgramFee) => {
    if (fee.level === 'university') return [];
    const prog = typeof fee.programId === 'object' ? fee.programId : programs.find(p => p.id === fee.programId);
    return prog?.specialisations || [];
  };


  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Program Fee Structures</h2>
              <p className="text-muted-foreground">Manage fee structures for programs or entire universities</p>
            </div>
            <Button onClick={() => { resetForm(); setViewMode('wizard'); }}><Plus className="w-4 h-4 mr-2" />Add New</Button>
          </div>

          <div className="flex gap-4">
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={selectedUniversityId} onChange={(e) => setSelectedUniversityId(e.target.value)}>
              <option value="">All Universities</option>
              {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)}>
              <option value="">All Programs</option>
              {programs.filter(p => !selectedUniversityId || p.universityId === selectedUniversityId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button variant="outline" size="icon" onClick={fetchAllData}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">Loading fee structures...</div>
            ) : filteredFees.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-50 border border-dashed rounded-lg text-muted-foreground">
                <IndianRupee className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No fee structures found.</p>
                <Button variant="link" onClick={() => setViewMode('wizard')} className="mt-2 text-indigo-600">Create the first one</Button>
              </div>
            ) : (
              filteredFees.map(fee => {
                const progName = fee.level === 'program' 
                  ? (typeof fee.programId === 'object' && fee.programId ? fee.programId.name : programs.find(p => p.id === fee.programId)?.name || 'Unknown Program')
                  : 'All Programs';
                const uniName = typeof fee.universityId === 'object' && fee.universityId ? fee.universityId.name : universities.find(u => u.id === fee.universityId)?.name || 'Unknown University';
                const sess = (fee as any).admissionSession?.name || (typeof fee.admissionSessionId === 'object' && fee.admissionSessionId ? fee.admissionSessionId.name : sessions.find(s => s.id === fee.admissionSessionId)?.name) || '';
                const specs = fee.level === 'program' ? (typeof fee.programId === 'object' && fee.programId?.specialisations ? fee.programId.specialisations : programs.find(p => p.id === fee.programId)?.specialisations || []) : [];

                return (
                  <Card key={fee.id} className="overflow-hidden border-slate-200 hover:border-slate-300 transition-colors">
                    <CardHeader className="bg-slate-50/50 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {fee.level === 'program' ? <BookOpen className="w-4 h-4 text-indigo-500" /> : <Building2 className="w-4 h-4 text-emerald-500" />}
                            {progName}
                          </CardTitle>
                          <CardDescription className="mt-1">{uniName}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">{fee.currency || 'INR'} {(fee.fullProgramFee || 0).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Total Program Fee</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-indigo-50">{fee.level.toUpperCase()}</Badge>
                            {fee.billingCycle === 'both' ? (
                              <>
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-medium">Yearly</Badge>
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">Semester</Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">{fee.billingCycle?.replace('_', ' ')}</Badge>
                            )}
                            {Number(fee.fullProgramFee || 0) > 0 && (
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">One-Time</Badge>
                            )}
                            {sess && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-xs">{sess}</Badge>}
                            {fee.specialisation && <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none text-xs">{fee.specialisation}</Badge>}
                          </div>
                          
                          {specs.length > 0 && !fee.specialisation && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                                <GraduationCap className="w-3 h-3 text-primary" /> Appies to:
                              </span>
                              {specs.map((s: string, idx: number) => (
                                <span key={idx} className="text-xs px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">{s}</span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-sm font-medium px-2 py-0.5">
                              {fee.currency || 'INR'} {fee.baseFee.toLocaleString()} Tuition
                            </Badge>
                            {fee.universityFee !== undefined && fee.universityFee > 0 && (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-sm font-medium px-2 py-0.5">
                                {fee.currency || 'INR'} {fee.universityFee.toLocaleString()} Uni Fee
                              </Badge>
                            )}
                            {fee.oneTimeUniversityFee > 0 && (
                              <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200 shadow-sm font-medium px-2 py-0.5">
                                {fee.currency || 'INR'} {fee.oneTimeUniversityFee.toLocaleString()} One-Time Uni
                              </Badge>
                            )}
                            {fee.oneTimeCommission > 0 && (
                              <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200 shadow-sm font-medium px-2 py-0.5">
                                {fee.oneTimeCommission}% One-Time Comm
                              </Badge>
                            )}
                            {fee.additionalFees?.find((f: any) => ['one time payment', 'registration fee', 'admission fee'].includes(f.label.toLowerCase())) && (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-sm font-medium px-2 py-0.5">
                                {fee.currency || 'INR'} {fee.additionalFees.find((f: any) => ['one time payment', 'registration fee', 'admission fee'].includes(f.label.toLowerCase()))?.amount.toLocaleString()} One Time
                              </Badge>
                            )}
                          </div>
                          
                          {fee.feeBreakdown && fee.feeBreakdown.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fee.feeBreakdown.map((b: any, idx: number) => {
                                const isSem = b.installmentType === 'semester' || (fee.billingCycle === 'per_semester' && !b.installmentType);
                                return (
                                  <div key={idx} className="p-2 bg-slate-50 border rounded-md text-xs">
                                    <div className="font-semibold mb-1 flex items-center justify-between">
                                      <span className={isSem ? 'text-blue-700 font-medium' : 'text-purple-700 font-medium'}>
                                        {isSem ? `Semester ${b.year || b.semester || idx + 1}` : `Year ${b.year || idx + 1}`}
                                      </span>
                                    </div>
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                                    <span>Tui: {b.baseFee}</span>
                                    <span>Uni: {b.universityFee}</span>
                                    {b.examFee > 0 && <span>Exam: {b.examFee}</span>}
                                    {b.commissionRate > 0 && <span>Comm: {b.commissionRate}%</span>}
                                    {b.dueDate && <span className="col-span-2 text-blue-600">Due: {new Date(b.dueDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</span>}
                                    {Array.isArray(b.additionalFees) && b.additionalFees.length > 0 && (
                                      <div className="col-span-2 mt-1 border-t pt-1">
                                        {b.additionalFees.map((af: any, afi: number) => (
                                          <span key={afi} className="inline-block mr-2 text-orange-600">{af.label}: {af.amount}</span>
                                        ))}
                                      </div>
                                    )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 self-end sm:self-center">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(fee)} className="hover:bg-primary/10">
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)} className="hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col min-h-[600px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Fee Structure Management</h2>
              <p className="text-muted-foreground text-sm">Configure program fees and billing structures step by step.</p>
            </div>
            <Button variant="ghost" onClick={() => { setViewMode('list'); resetForm(); }}>Cancel</Button>
          </div>
          
          <div className="p-6 flex-1 bg-slate-50/50">
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold flex items-center"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-sm mr-2">1</span> Select University</h3>
                  <p className="text-sm text-muted-foreground ml-8">Choose a university to manage its programs' fee structures.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-8">
                  {universities.map(u => (
                    <div 
                      key={u.id} 
                      onClick={() => { setForm({ ...form, universityId: u.id, admissionSessionId: '', programId: '', specialisation: '' }); setWizardStep(2); }}
                      className="p-4 border rounded-xl bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                        <Building2 className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{u.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6 flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setWizardStep(1)} className="rounded-full w-8 h-8"><span className="sr-only">Back</span>&larr;</Button>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-sm mr-2">2</span> Select Session</h3>
                    <p className="text-sm text-muted-foreground ml-8">{universities.find(u => u.id === form.universityId)?.name} - Choose a session to configure fees for.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-11">
                  <div 
                    onClick={() => { setForm({ ...form, admissionSessionId: '__none__' }); setWizardStep(3); }}
                    className="p-4 border rounded-xl bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Default (All Sessions)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Fallback fee structure</p>
                    </div>
                  </div>
                  {sessions.filter(s => !s.universityId || s.universityId === form.universityId).map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setForm({ ...form, admissionSessionId: s.id }); setWizardStep(3); }}
                      className="p-4 border rounded-xl bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                        <Calendar className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{s.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Term dates: {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6 flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setWizardStep(2)} className="rounded-full w-8 h-8"><span className="sr-only">Back</span>&larr;</Button>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-sm mr-2">3</span> Select Program</h3>
                    <p className="text-sm text-muted-foreground ml-8">Choose a program.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-11">
                  {programs.filter(p => p.universityId === form.universityId).map(p => {
                    const hasSpecs = p.specialisations && p.specialisations.length > 0;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => { 
                          setForm({ ...form, programId: p.id, specialisation: '' }); 
                          if (hasSpecs) setWizardStep(3.5); 
                          else setWizardStep(4); 
                        }}
                        className="p-4 border rounded-xl bg-white hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100">
                          <BookOpen className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{p.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.code}</p>
                          {hasSpecs && <Badge variant="secondary" className="mt-2 text-[10px] bg-slate-100 text-slate-600">Has Specialisations</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {wizardStep === 3.5 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6 flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setWizardStep(3)} className="rounded-full w-8 h-8"><span className="sr-only">Back</span>&larr;</Button>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-sm mr-2">3.5</span> Select Specialisation</h3>
                    <p className="text-sm text-muted-foreground ml-8">{programs.find(p => p.id === form.programId)?.name} has multiple specialisations. Choose one to configure its fee structure.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-11">
                  <div 
                    onClick={() => { setForm({ ...form, specialisation: '' }); setWizardStep(4); }}
                    className="p-4 border rounded-xl bg-white hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Default (All Specialisations)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Applies to all</p>
                    </div>
                  </div>
                  {programs.find(p => p.id === form.programId)?.specialisations?.map((s, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setForm({ ...form, specialisation: s }); setWizardStep(4); }}
                      className="p-4 border rounded-xl bg-white hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all group flex gap-4 items-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100">
                        <GraduationCap className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{s}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setWizardStep(programs.find(p => p.id === form.programId)?.specialisations?.length ? 3.5 : 3)} className="rounded-full w-8 h-8"><span className="sr-only">Back</span>&larr;</Button>
                    <div>
                      <h3 className="text-lg font-semibold flex items-center"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-sm mr-2">4</span> Configure Fee Details</h3>
                      <div className="flex items-center gap-2 mt-1 ml-8">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700">{universities.find(u => u.id === form.universityId)?.name}</Badge>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">{programs.find(p => p.id === form.programId)?.name}</Badge>
                        {form.specialisation && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{form.specialisation}</Badge>}
                        {form.admissionSessionId && form.admissionSessionId !== '__none__' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">{sessions.find(s => s.id === form.admissionSessionId)?.name}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-700">All Sessions</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
                  <div className="space-y-1">
                    <Label>Level <span className="text-destructive">*</span></Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background max-w-xs" value={form.level} onChange={(e) => setForm({...form, level: e.target.value})} disabled>
                      <option value="program">Program</option>
                    </select>
                  </div>

                  {/* Payment Mode Selection Cards */}
                  <div className="space-y-2 border-t pt-4">
                    <div>
                      <Label className="text-base font-semibold text-slate-900">Allowed Payment Modes <span className="text-destructive">*</span></Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select all payment options permitted for this program. You can enable One-Time, Yearly, and Semester all together, or exclude any mode.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      {/* One-Time Card */}
                      <div 
                        onClick={() => setForm(f => ({ ...f, enableOneTime: !f.enableOneTime }))}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${form.enableOneTime ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={form.enableOneTime} 
                              onChange={(e) => setForm(f => ({ ...f, enableOneTime: e.target.checked }))} 
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()} 
                            />
                            One-Time Payment
                          </span>
                          <Badge variant={form.enableOneTime ? "default" : "outline"} className={form.enableOneTime ? "bg-emerald-600 text-white" : ""}>
                            {form.enableOneTime ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Complete program payment upfront.</p>
                      </div>

                      {/* Yearly Card */}
                      <div 
                        onClick={() => setForm(f => ({ ...f, enableYearly: !f.enableYearly }))}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${form.enableYearly ? 'border-purple-500 bg-purple-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={form.enableYearly} 
                              onChange={(e) => setForm(f => ({ ...f, enableYearly: e.target.checked }))} 
                              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()} 
                            />
                            Yearly Installment
                          </span>
                          <Badge variant={form.enableYearly ? "default" : "outline"} className={form.enableYearly ? "bg-purple-600 text-white" : ""}>
                            {form.enableYearly ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Per-year payment schedule.</p>
                      </div>

                      {/* Semester Card */}
                      <div 
                        onClick={() => setForm(f => ({ ...f, enableSemester: !f.enableSemester }))}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${form.enableSemester ? 'border-blue-500 bg-blue-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={form.enableSemester} 
                              onChange={(e) => setForm(f => ({ ...f, enableSemester: e.target.checked }))} 
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()} 
                            />
                            Semester Installment
                          </span>
                          <Badge variant={form.enableSemester ? "default" : "outline"} className={form.enableSemester ? "bg-blue-600 text-white" : ""}>
                            {form.enableSemester ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Per-semester payment schedule.</p>
                      </div>
                    </div>
                  </div>

                  {/* ONE-TIME CONFIGURATION SECTION */}
                  {form.enableOneTime && (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-4">
                      <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                        <Badge className="bg-emerald-600 text-white">One-Time (Full Program) Details</Badge>
                        <span className="text-xs text-emerald-800 font-medium">Configure upfront fee and one-time components</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Full Payment Amount (One-Time) <span className="text-destructive">*</span></Label>
                          <p className="text-xs text-muted-foreground">Amount if student pays entire program upfront</p>
                          <Input type="number" min="0" required={form.enableOneTime} value={form.fullProgramFee} onChange={(e) => setForm({...form, fullProgramFee: e.target.value})} className="bg-white" />
                        </div>
                        <div className="space-y-1">
                          <Label>One Time University Fee <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <p className="text-xs text-muted-foreground">University share for full payment</p>
                          <Input type="number" min="0" value={form.oneTimeUniversityFee} onChange={(e) => setForm({...form, oneTimeUniversityFee: e.target.value})} className="bg-white" />
                        </div>
                        <div className="space-y-1">
                          <Label>One Time Commission (%) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <p className="text-xs text-muted-foreground">Center commission on full payment</p>
                          <Input type="number" min="0" max="100" value={form.oneTimeCommission} onChange={(e) => setForm({...form, oneTimeCommission: e.target.value})} className="bg-white" />
                        </div>
                      </div>

                      {/* One-Time Additional Fees */}
                      <div className="bg-white p-3.5 rounded-lg border border-emerald-200/60">
                        <Label className="text-xs font-semibold mb-2 block text-slate-800">Additional One-Time Fees <span className="text-xs font-normal text-muted-foreground">(optional — charged once at enrollment)</span></Label>
                        {Array.isArray(form.additionalFees) && form.additionalFees.map((fee, idx) => (
                          <div key={fee.id} className="flex gap-3 mb-2 items-center">
                            <Input placeholder="Fee Name (e.g. Admission / Lab Fee)" value={fee.label} onChange={e => handleAdditionalFeeChange(idx, 'label', e.target.value)} className="flex-1 bg-white h-8 text-sm" />
                            <Input type="number" placeholder="Amount" value={fee.amount} onChange={e => handleAdditionalFeeChange(idx, 'amount', e.target.value)} className="w-32 bg-white h-8 text-sm" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalFee(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addAdditionalFee} className="mt-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-white h-8 text-xs">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add One-Time Fee
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* YEAR-WISE INSTALLMENT SCHEDULE SECTION */}
                  {form.enableYearly && (
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/20 space-y-4">
                      <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-600 text-white">Year-Wise Installment Schedule</Badge>
                          <span className="text-xs text-purple-800 font-medium">({form.yearlyBreakdown.length} Annual Installments)</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {form.yearlyBreakdown.map((b, idx) => (
                          <div key={idx} className="p-3.5 border rounded-lg bg-white relative shadow-sm">
                            <div className="w-full font-semibold text-sm text-purple-900 border-b pb-1.5 mb-3 flex items-center justify-between">
                              <span>Year {b.year}</span>
                              <span className="text-xs text-muted-foreground font-normal">Annual Installment #{idx + 1}</span>
                            </div>
                            <div className="flex flex-wrap items-end gap-2.5">
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Tuition Fee</Label>
                                <Input type="number" value={b.baseFee} onChange={(e) => handleYearlyBreakdownChange(idx, 'baseFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">University Fee</Label>
                                <Input type="number" value={b.universityFee} onChange={(e) => handleYearlyBreakdownChange(idx, 'universityFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Exam Fee</Label>
                                <Input type="number" value={b.examFee} onChange={(e) => handleYearlyBreakdownChange(idx, 'examFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Commission Rate (%)</Label>
                                <Input type="number" value={b.commissionRate} onChange={(e) => handleYearlyBreakdownChange(idx, 'commissionRate', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[130px] space-y-1">
                                <Label className="text-xs">Due Date</Label>
                                <Input type="date" value={b.dueDate ? String(b.dueDate).slice(0,10) : ''} onChange={(e) => handleYearlyBreakdownChange(idx, 'dueDate', e.target.value)} className="h-8 text-sm" />
                              </div>
                            </div>

                            {/* Per-installment additional fees */}
                            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                Additional Fees for Year {b.year} <span className="font-normal text-muted-foreground">(optional)</span>
                              </Label>
                              {Array.isArray(b.additionalFees) && b.additionalFees.map((fee: any, fIdx: number) => (
                                <div key={fee.id} className="flex gap-2.5 mb-1.5 items-center">
                                  <Input className="h-7 text-xs flex-1 bg-white" placeholder="Fee Name (e.g. Lab Fee)" value={fee.label} onChange={e => handleYearlyBreakdownAdditionalFeeChange(idx, fIdx, 'label', e.target.value)} />
                                  <Input className="h-7 text-xs w-28 bg-white" type="number" placeholder="Amount" value={fee.amount} onChange={e => handleYearlyBreakdownAdditionalFeeChange(idx, fIdx, 'amount', e.target.value)} />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeYearlyBreakdownAdditionalFee(idx, fIdx)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" variant="ghost" size="sm" onClick={() => addYearlyBreakdownAdditionalFee(idx)} className="h-7 text-xs text-purple-600 hover:bg-purple-50 mt-0.5">
                                <Plus className="w-3 h-3 mr-1" /> Add Installment Fee
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEMESTER-WISE INSTALLMENT SCHEDULE SECTION */}
                  {form.enableSemester && (
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-4">
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-white">Semester-Wise Installment Schedule</Badge>
                          <span className="text-xs text-blue-800 font-medium">({form.semesterBreakdown.length} Semester Installments)</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {form.semesterBreakdown.map((b, idx) => (
                          <div key={idx} className="p-3.5 border rounded-lg bg-white relative shadow-sm">
                            <div className="w-full font-semibold text-sm text-blue-900 border-b pb-1.5 mb-3 flex items-center justify-between">
                              <span>Semester {b.year}</span>
                              <span className="text-xs text-muted-foreground font-normal">Semester Installment #{idx + 1}</span>
                            </div>
                            <div className="flex flex-wrap items-end gap-2.5">
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Tuition Fee</Label>
                                <Input type="number" value={b.baseFee} onChange={(e) => handleSemesterBreakdownChange(idx, 'baseFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">University Fee</Label>
                                <Input type="number" value={b.universityFee} onChange={(e) => handleSemesterBreakdownChange(idx, 'universityFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Exam Fee</Label>
                                <Input type="number" value={b.examFee} onChange={(e) => handleSemesterBreakdownChange(idx, 'examFee', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <Label className="text-xs">Commission Rate (%)</Label>
                                <Input type="number" value={b.commissionRate} onChange={(e) => handleSemesterBreakdownChange(idx, 'commissionRate', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="flex-1 min-w-[130px] space-y-1">
                                <Label className="text-xs">Due Date</Label>
                                <Input type="date" value={b.dueDate ? String(b.dueDate).slice(0,10) : ''} onChange={(e) => handleSemesterBreakdownChange(idx, 'dueDate', e.target.value)} className="h-8 text-sm" />
                              </div>
                            </div>

                            {/* Per-installment additional fees */}
                            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                Additional Fees for Semester {b.year} <span className="font-normal text-muted-foreground">(optional)</span>
                              </Label>
                              {Array.isArray(b.additionalFees) && b.additionalFees.map((fee: any, fIdx: number) => (
                                <div key={fee.id} className="flex gap-2.5 mb-1.5 items-center">
                                  <Input className="h-7 text-xs flex-1 bg-white" placeholder="Fee Name (e.g. Lab Fee)" value={fee.label} onChange={e => handleSemesterBreakdownAdditionalFeeChange(idx, fIdx, 'label', e.target.value)} />
                                  <Input className="h-7 text-xs w-28 bg-white" type="number" placeholder="Amount" value={fee.amount} onChange={e => handleSemesterBreakdownAdditionalFeeChange(idx, fIdx, 'amount', e.target.value)} />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSemesterBreakdownAdditionalFee(idx, fIdx)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" variant="ghost" size="sm" onClick={() => addSemesterBreakdownAdditionalFee(idx)} className="h-7 text-xs text-blue-600 hover:bg-blue-50 mt-0.5">
                                <Plus className="w-3 h-3 mr-1" /> Add Installment Fee
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => { setViewMode('list'); resetForm(); }}>Cancel</Button>
                    <Button type="submit" disabled={loading} className="min-w-[120px]">{loading ? 'Saving...' : (editing ? 'Update Fee Structure' : 'Create Fee Structure')}</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
