import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, IndianRupee, BookOpen,
  GraduationCap, Building2, Calendar, Search, RotateCcw,
  Layers, ChevronDown, ChevronUp, LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  universityId?: string;
  startDate?: string;
  endDate?: string;
}

export function ProgramFeeStructurePanel() {
  const [fees, setFees] = useState<ProgramFee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupByUniversity, setGroupByUniversity] = useState<boolean>(true);
  const [expandedSpecIds, setExpandedSpecIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [, setOpen] = useState(false);
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

  // Filter programs based on selected university
  const filteredProgramsForSelect = useMemo(() => {
    if (!selectedUniversityId) return programs;
    return programs.filter(p => {
      const uId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
      return String(uId) === String(selectedUniversityId);
    });
  }, [programs, selectedUniversityId]);

  const filteredFees = useMemo(() => {
    let result = fees;
    if (selectedUniversityId) {
      result = result.filter(f => {
        const uId = typeof f.universityId === 'object' ? f.universityId?.id : f.universityId;
        return String(uId) === String(selectedUniversityId);
      });
    }
    if (selectedProgramId) {
      result = result.filter(f => {
        const pId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
        return String(pId) === String(selectedProgramId);
      });
    }
    if (billingCycleFilter && billingCycleFilter !== 'all') {
      result = result.filter(f => {
        if (billingCycleFilter === 'one_time') {
          return f.billingCycle === 'one_time' || Number(f.fullProgramFee || 0) > 0;
        }
        return f.billingCycle === billingCycleFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => {
        const pName = f.level === 'program'
          ? (typeof f.programId === 'object' && f.programId ? `${f.programId.name} ${f.programId.code || ''}` : programs.find(p => p.id === f.programId)?.name || '')
          : 'All Programs';
        const uName = typeof f.universityId === 'object' && f.universityId
          ? f.universityId.name
          : universities.find(u => u.id === f.universityId)?.name || '';
        const spec = f.specialisation || '';
        return (
          pName.toLowerCase().includes(q) ||
          uName.toLowerCase().includes(q) ||
          spec.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [fees, selectedUniversityId, selectedProgramId, billingCycleFilter, searchQuery, programs, universities]);

  // Group filtered fees by University for structured organization
  const groupedFeesByUni = useMemo(() => {
    const groups: Record<string, { uniId: string; uniName: string; uniCode: string; items: ProgramFee[] }> = {};
    filteredFees.forEach(fee => {
      const uId = (typeof fee.universityId === 'object' && fee.universityId ? fee.universityId.id : String(fee.universityId || 'unknown'));
      const uniObj = universities.find(u => String(u.id) === String(uId));
      const uName = (typeof fee.universityId === 'object' && fee.universityId ? fee.universityId.name : uniObj?.name) || 'Other / Unassigned University';
      const uCode = uniObj?.code || '';
      if (!groups[uId]) {
        groups[uId] = { uniId: uId, uniName: uName, uniCode: uCode, items: [] };
      }
      groups[uId].items.push(fee);
    });
    return Object.values(groups).sort((a, b) => a.uniName.localeCompare(b.uniName));
  }, [filteredFees, universities]);

  // Summary metrics
  const summaryStats = useMemo(() => {
    const uniSet = new Set<string>();
    const progSet = new Set<string>();
    let semCount = 0;
    let yearCount = 0;

    fees.forEach(f => {
      const uId = typeof f.universityId === 'object' ? f.universityId?.id : f.universityId;
      const pId = typeof f.programId === 'object' ? f.programId?.id : f.programId;
      if (uId) uniSet.add(String(uId));
      if (pId) progSet.add(String(pId));
      if (f.billingCycle === 'per_semester' || f.billingCycle === 'both') semCount++;
      if (f.billingCycle === 'per_year' || f.billingCycle === 'yearly' || f.billingCycle === 'both') yearCount++;
    });

    return {
      totalStructures: fees.length,
      universitiesCount: uniSet.size,
      programsCount: progSet.size,
      semCount,
      yearCount,
    };
  }, [fees]);

  const hasActiveFilters = Boolean(selectedUniversityId || selectedProgramId || billingCycleFilter !== 'all' || searchQuery.trim());

  const clearAllFilters = () => {
    setSelectedUniversityId('');
    setSelectedProgramId('');
    setBillingCycleFilter('all');
    setSearchQuery('');
  };

  const renderFeeCard = (fee: ProgramFee) => {
    const progObj = typeof fee.programId === 'object' && fee.programId
      ? fee.programId
      : programs.find(p => p.id === fee.programId);
    const progName = fee.level === 'program'
      ? (progObj?.name || 'Unknown Program')
      : 'All University Programs';
    const progCode = fee.level === 'program' ? (progObj?.code || '') : '';
    const uniName = typeof fee.universityId === 'object' && fee.universityId
      ? fee.universityId.name
      : universities.find(u => u.id === fee.universityId)?.name || 'Unknown University';
    const sess = (fee as any).admissionSession?.name
      || (typeof fee.admissionSessionId === 'object' && fee.admissionSessionId ? fee.admissionSessionId.name : sessions.find(s => s.id === fee.admissionSessionId)?.name)
      || '';
    const specs: string[] = fee.level === 'program'
      ? (Array.isArray(progObj?.specialisations) ? progObj.specialisations : [])
      : [];

    // Parse breakdown safely
    const breakdownList = Array.isArray(fee.feeBreakdown) ? fee.feeBreakdown : [];
    const semItems = breakdownList.filter((b: any) => b.installmentType === 'semester' || (fee.billingCycle === 'per_semester' && !b.installmentType));
    const yearItems = breakdownList.filter((b: any) => b.installmentType === 'year' || ((fee.billingCycle === 'per_year' || fee.billingCycle === 'yearly') && !b.installmentType));
    const activeBreakdown = semItems.length > 0 ? semItems : (yearItems.length > 0 ? yearItems : breakdownList);

    const calcTuition = Number(fee.baseFee || 0) > 0
      ? Number(fee.baseFee)
      : activeBreakdown.reduce((sum: number, b: any) => sum + Number(b.baseFee || 0), 0);

    const calcUniFee = Number(fee.universityFee || 0) > 0
      ? Number(fee.universityFee)
      : activeBreakdown.reduce((sum: number, b: any) => sum + Number(b.universityFee || 0), 0);

    const calcExamFee = activeBreakdown.reduce((sum: number, b: any) => sum + Number(b.examFee || 0), 0);

    const primaryDisplayFee = calcTuition > 0
      ? calcTuition
      : (Number(fee.fullProgramFee || 0) > 0 ? Number(fee.fullProgramFee) : 0);

    const primaryFeeLabel = calcTuition > 0
      ? 'Total Tuition Fee'
      : (Number(fee.fullProgramFee || 0) > 0 ? 'One-Time Full Fee' : 'Total Program Fee');

    const isSpecExpanded = Boolean(expandedSpecIds[fee.id]);
    const visibleSpecs = isSpecExpanded ? specs : specs.slice(0, 2);
    const hiddenSpecCount = Math.max(0, specs.length - 2);

    const oneTimeAddFee = fee.additionalFees?.find((f: any) =>
      ['one time payment', 'registration fee', 'admission fee'].includes(String(f.label || '').toLowerCase())
    );

    const renderBreakdownGrid = (items: any[], typeLabel: 'Semester' | 'Year', colorScheme: 'blue' | 'purple') => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${colorScheme === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
            {typeLabel}-Wise Schedule ({items.length} {typeLabel}{items.length > 1 ? 's' : ''})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((b: any, idx: number) => {
            const periodNum = typeLabel === 'Semester' ? (b.semester || b.year || idx + 1) : (b.year || idx + 1);
            return (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col justify-between gap-1.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                  <span className={`font-bold text-xs ${colorScheme === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
                    {typeLabel} {periodNum}
                  </span>
                  {Number(b.commissionRate || 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold text-[10px]">
                      Comm: {b.commissionRate}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tuition:</span>
                    <span className="font-semibold text-foreground">₹{Number(b.baseFee || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uni Fee:</span>
                    <span className="font-semibold text-foreground">₹{Number(b.universityFee || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {Number(b.examFee || 0) > 0 && (
                    <div className="flex justify-between col-span-2 pt-0.5 border-t border-dashed border-slate-200/60 dark:border-slate-800">
                      <span className="text-muted-foreground">Exam Fee:</span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">₹{Number(b.examFee).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {(b.dueDate || (Array.isArray(b.additionalFees) && b.additionalFees.length > 0)) && (
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800 space-y-0.5 text-[10px]">
                    {b.dueDate && (
                      <div className="text-blue-600 dark:text-blue-400 font-medium">
                        Due: {new Date(b.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    {Array.isArray(b.additionalFees) && b.additionalFees.map((af: any, afi: number) => (
                      <div key={afi} className="text-orange-600 dark:text-orange-400 truncate">
                        + {af.label}: ₹{Number(af.amount || 0).toLocaleString('en-IN')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <Card key={fee.id} className="overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all rounded-2xl bg-card">
        {/* Card Header */}
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                fee.level === 'program'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}>
                {fee.level === 'program' ? <BookOpen className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-foreground leading-snug">
                    {progName}
                  </CardTitle>
                  {progCode && (
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 bg-background">
                      {progCode}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{uniName}</span>
                  {sess && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">{sess}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>

            {/* Right: Total Fee + Edit/Delete Actions */}
            <div className="flex items-start gap-3 shrink-0">
              <div className="text-right">
                <div className="text-lg font-extrabold text-foreground leading-none">
                  ₹{primaryDisplayFee.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground mt-1">
                  {primaryFeeLabel}
                </div>
              </div>
              <div className="flex items-center gap-1 pl-2 border-l border-border/60">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(fee)}
                  title="Edit Fee Structure"
                  className="h-8 w-8 rounded-lg text-slate-600 hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(fee.id)}
                  title="Delete Fee Structure"
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Card Content */}
        <CardContent className="p-4 space-y-3.5">
          {/* Badges & Specialisation Row */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50/70 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300">
                {fee.level.toUpperCase()}
              </Badge>
              {fee.billingCycle === 'both' ? (
                <>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-medium">
                    Yearly Schedule
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium">
                    Semester Schedule
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="text-[10px] capitalize font-medium">
                  {fee.billingCycle?.replace('_', ' ') || 'Standard'}
                </Badge>
              )}
              {Number(fee.fullProgramFee || 0) > 0 && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                  One-Time: ₹{Number(fee.fullProgramFee).toLocaleString('en-IN')}
                </Badge>
              )}
              {fee.specialisation && (
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none text-[10px] gap-1">
                  <GraduationCap className="w-3 h-3" /> {fee.specialisation}
                </Badge>
              )}
            </div>

            {/* Compact Collapsible Specialisations List */}
            {specs.length > 0 && !fee.specialisation && (
              <div className="flex items-center gap-1.5 flex-wrap bg-muted/40 p-2 rounded-lg border border-border/50">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mr-1">
                  <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                  Applies to ({specs.length}):
                </span>
                {visibleSpecs.map((s: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 bg-background border border-border/80 rounded-md text-foreground font-medium max-w-[260px] truncate"
                    title={s}
                  >
                    {s}
                  </span>
                ))}
                {hiddenSpecCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedSpecIds(prev => ({ ...prev, [fee.id]: !prev[fee.id] }))}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex items-center gap-0.5"
                  >
                    {isSpecExpanded ? (
                      <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>+{hiddenSpecCount} more <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary Totals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Tuition</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                ₹{calcTuition.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Uni Fee</p>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                ₹{calcUniFee.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Exam Fee</p>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                ₹{calcExamFee.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {Number(fee.oneTimeCommission || 0) > 0 ? 'One-Time Comm' : 'One-Time Fee'}
              </p>
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mt-0.5">
                {Number(fee.oneTimeCommission || 0) > 0
                  ? `${fee.oneTimeCommission}%`
                  : oneTimeAddFee
                  ? `₹${Number(oneTimeAddFee.amount || 0).toLocaleString('en-IN')}`
                  : Number(fee.fullProgramFee || 0) > 0
                  ? `₹${Number(fee.fullProgramFee).toLocaleString('en-IN')}`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Period Breakdown Grids */}
          {semItems.length > 0 && yearItems.length > 0 ? (
            <div className="space-y-3 pt-1">
              {renderBreakdownGrid(semItems, 'Semester', 'blue')}
              {renderBreakdownGrid(yearItems, 'Year', 'purple')}
            </div>
          ) : semItems.length > 0 ? (
            renderBreakdownGrid(semItems, 'Semester', 'blue')
          ) : yearItems.length > 0 ? (
            renderBreakdownGrid(yearItems, 'Year', 'purple')
          ) : breakdownList.length > 0 ? (
            renderBreakdownGrid(breakdownList, fee.billingCycle === 'per_semester' ? 'Semester' : 'Year', 'blue')
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight">Program Fee Structures</h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredFees.length} / {fees.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure and manage semester, annual, and one-time fee structures across universities and programs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading} className="h-9">
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => { resetForm(); setViewMode('wizard'); }} className="h-9">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Fee Structure
              </Button>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Fee Structures</p>
                  <p className="text-2xl font-extrabold text-foreground mt-0.5">{summaryStats.totalStructures}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Universities Covered</p>
                  <p className="text-2xl font-extrabold text-foreground mt-0.5">{summaryStats.universitiesCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Programs Configured</p>
                  <p className="text-2xl font-extrabold text-foreground mt-0.5">{summaryStats.programsCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <BookOpen className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Schedule Breakdown</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {summaryStats.semCount} Semester
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {summaryStats.yearCount} Yearly
                    </Badge>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="rounded-xl border shadow-xs">
            <CardContent className="p-3.5 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search program, university, code, or specialisation..."
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* University Filter */}
              <select
                className="h-9 border border-input rounded-md px-3 text-xs font-medium bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
                value={selectedUniversityId}
                onChange={e => {
                  setSelectedUniversityId(e.target.value);
                  setSelectedProgramId('');
                }}
              >
                <option value="">All Universities ({universities.length})</option>
                {universities.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.code ? ` (${u.code})` : ''}
                  </option>
                ))}
              </select>

              {/* Program Filter (Scoped by University) */}
              <select
                className="h-9 border border-input rounded-md px-3 text-xs font-medium bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px] max-w-[260px]"
                value={selectedProgramId}
                onChange={e => setSelectedProgramId(e.target.value)}
              >
                <option value="">All Programs ({filteredProgramsForSelect.length})</option>
                {filteredProgramsForSelect.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.code ? ` (${p.code})` : ''}
                  </option>
                ))}
              </select>

              {/* Billing Cycle Filter */}
              <select
                className="h-9 border border-input rounded-md px-3 text-xs font-medium bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={billingCycleFilter}
                onChange={e => setBillingCycleFilter(e.target.value)}
              >
                <option value="all">All Billing Modes</option>
                <option value="per_semester">Semester-Wise</option>
                <option value="per_year">Year-Wise</option>
                <option value="both">Both (Year & Sem)</option>
                <option value="one_time">One-Time</option>
              </select>

              {/* Group by University Toggle */}
              <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setGroupByUniversity(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    groupByUniversity ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  By University
                </button>
                <button
                  type="button"
                  onClick={() => setGroupByUniversity(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    !groupByUniversity ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grid View
                </button>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Fee Structures Content */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 rounded-2xl bg-muted/50 animate-pulse border" />
              ))}
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed rounded-2xl text-muted-foreground">
              <IndianRupee className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No fee structures found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters ? 'Try adjusting your filters or search query.' : 'Get started by creating your first program fee structure.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-3">
                  Clear Filters
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => setViewMode('wizard')} className="mt-3">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Fee Structure
                </Button>
              )}
            </div>
          ) : groupByUniversity ? (
            <div className="space-y-8">
              {groupedFeesByUni.map(group => (
                <div key={group.uniId} className="space-y-3">
                  {/* University Section Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground">{group.uniName}</h3>
                      {group.uniCode && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-background">
                          {group.uniCode}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {group.items.length} {group.items.length === 1 ? 'Program Fee' : 'Program Fees'}
                    </Badge>
                  </div>

                  {/* University's Fee Cards Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                    {group.items.map(fee => renderFeeCard(fee))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              {filteredFees.map(fee => renderFeeCard(fee))}
            </div>
          )}
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
