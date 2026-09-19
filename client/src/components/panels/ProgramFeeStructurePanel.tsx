import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, IndianRupee, BookOpen, GraduationCap, Building2 } from 'lucide-react';
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
    billingCycle: 'per_year', 
    currency: 'INR', 
    effectiveFrom: '', 
    additionalFees: '',
    feeBreakdown: [] as any[],
    baseFee: '0',
    universityFee: '0',
    fullProgramFee: '0',
  });

  
  useEffect(() => {
    let dur = 36; // Default to 3 years
    
    if (form.level === 'program') {
       if (!form.programId) return;
       const prog = programs.find(p => p.id === form.programId);
       if (prog) dur = prog.duration || 36;
    }

    let numBlocks = 1;
    if (form.billingCycle === 'per_year') numBlocks = Math.max(1, Math.floor(dur / 12));
    else if (form.billingCycle === 'per_semester') numBlocks = Math.max(1, Math.floor(dur / 6));
    
    setForm(prev => {
       const newBreakdown = [...prev.feeBreakdown];
       while (newBreakdown.length < numBlocks) {
         newBreakdown.push({
           year: newBreakdown.length + 1,
           baseFee: '0',
           universityFee: '0',
           examFee: '0',
           commissionRate: '0',
           dueDate: '',
           additionalFees: ''
         });
       }
       if (newBreakdown.length > numBlocks) {
         newBreakdown.length = numBlocks;
       }
       if (newBreakdown.length !== prev.feeBreakdown.length) {
           return { ...prev, feeBreakdown: newBreakdown };
       }
       return prev;
    });
  }, [form.programId, form.billingCycle, programs, form.level]);

  const handleBreakdownChange = (idx: number, field: string, value: string) => {
    setForm(prev => {
      const newBreakdown = [...prev.feeBreakdown];
      newBreakdown[idx] = { ...newBreakdown[idx], [field]: value };
      return { ...prev, feeBreakdown: newBreakdown };
    });
  };

const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [feesRes, progsRes, unisRes, sessionsRes, subDeptsRes] = await Promise.all([
        api.get('/finance/program-fees'),
        api.get('/operations/programs'),
        api.get('/operations/universities'),
        api.get('/operations/sessions').catch(() => ({ data: { data: [] } })),
        api.get('/sub-departments').catch(() => ({ data: { data: [] } })),
      ]);
      setFees(feesRes.data.data || []);
      setPrograms(progsRes.data.data || []);
      setUniversities(unisRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
      setSubDepartments(subDeptsRes.data.data || []);
      
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
      billingCycle: 'per_year', 
      currency: 'INR', 
      effectiveFrom: '', 
      additionalFees: '',
      feeBreakdown: [],
      baseFee: 0,
      fullProgramFee: 0
    });
    setWizardStep(1);
  };

  const openEdit = (fee: ProgramFee) => {
    setEditing(fee);
    setViewMode('wizard');
    setWizardStep(4);
    
    const otherFees = fee.additionalFees?.filter(
      f => !['registration fee', 'exam fee', 'gst'].includes(f.label.toLowerCase())
    ) || [];

    const progId = typeof fee.programId === 'object' ? fee.programId?.id : fee.programId;
    const uniId = typeof fee.universityId === 'object' ? fee.universityId?.id : fee.universityId;
    const sessId = typeof fee.admissionSessionId === 'object' ? fee.admissionSessionId?.id : fee.admissionSessionId;

    let parsedBreakdown = fee.feeBreakdown || [];
    if (typeof parsedBreakdown === 'string') {
      try { parsedBreakdown = JSON.parse(parsedBreakdown); } catch (e) { parsedBreakdown = []; }
    }
    if (Array.isArray(parsedBreakdown) && parsedBreakdown.length > 0) {
       parsedBreakdown = parsedBreakdown.map((b: any) => ({
         year: b.year,
         baseFee: String(b.baseFee || '0'),
         universityFee: String(b.universityFee || '0'),
         examFee: String(b.examFee || '0'),
         commissionRate: String(b.commissionRate || '0'),
         dueDate: b.dueDate || '',
         additionalFees: b.additionalFees || ''
       }));
    }

    setForm({
      level: fee.level || 'program',
      programId: progId || '',
      universityId: uniId || '',
      admissionSessionId: sessId || '',
      specialisation: fee.specialisation || '',
      billingCycle: fee.billingCycle || 'per_year',
      currency: fee.currency || 'INR',
      effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.slice(0, 10) : '',
      baseFee: fee.baseFee || 0,
      fullProgramFee: fee.fullProgramFee || 0,
      commissionRate: fee.commissionRate !== undefined ? String(fee.commissionRate) : '0',
      additionalFees: otherFees.map(f => `${f.label}:${f.amount}`).join(', '),
      feeBreakdown: parsedBreakdown
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (form.level === 'program' && !form.programId) {
        toast.error('Please select a program');
        return;
      }
      if (form.level === 'university' && !form.universityId) {
        toast.error('Please select a university');
        return;
      }

      const addFees = [];
      if (form.additionalFees) {
        const custom = form.additionalFees.split(',').map(s => {
          const [label, amount] = s.trim().split(':');
          return { label: label?.trim(), amount: Number(amount) };
        }).filter(f => f.label && !isNaN(f.amount));
        addFees.push(...custom);
      }
      
      let totalBaseFee = 0;
      let totalUniversityFee = 0;
      let aggregatedCommissionRate = 0;
      
      const cleanBreakdown = form.feeBreakdown.map(b => {
         totalBaseFee += Number(b.baseFee || 0);
         totalUniversityFee += Number(b.universityFee || 0);
         if (Number(b.commissionRate || 0) > 0) aggregatedCommissionRate = Number(b.commissionRate);
         return {
           year: b.year,
           baseFee: Number(b.baseFee || 0),
           universityFee: Number(b.universityFee || 0),
           examFee: Number(b.examFee || 0),
           commissionRate: Number(b.commissionRate || 0),
           dueDate: b.dueDate,
           additionalFees: b.additionalFees || ''
         };
      });

      const payload = {
        level: form.level,
        programId: form.level === 'program' ? form.programId : undefined,
        universityId: form.universityId || undefined,
        admissionSessionId: form.admissionSessionId || undefined,
        specialisation: form.specialisation || undefined,
        baseFee: totalBaseFee,
        fullProgramFee: Number(form.fullProgramFee || 0),
        universityFee: totalUniversityFee,
        billingCycle: form.billingCycle,
        currency: form.currency,
        effectiveFrom: form.effectiveFrom || undefined,
        additionalFees: addFees,
        feeBreakdown: cleanBreakdown,
        commissionRate: aggregatedCommissionRate > 0 ? aggregatedCommissionRate : Number(form.commissionRate || 0),
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
                const sess = typeof fee.admissionSessionId === 'object' && fee.admissionSessionId ? fee.admissionSessionId.name : sessions.find(s => s.id === fee.admissionSessionId)?.name || '';
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
                            <Badge variant="outline" className="text-xs">{fee.billingCycle?.replace('_', ' ')}</Badge>
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
                          </div>
                          
                          {fee.feeBreakdown && fee.feeBreakdown.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fee.feeBreakdown.map((b: any, idx: number) => (
                                <div key={idx} className="p-2 bg-slate-50 border rounded-md text-xs">
                                  <div className="font-semibold mb-1">{fee.billingCycle === 'per_semester' ? 'Sem' : 'Year'} {b.year}</div>
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                                    <span>Tui: {b.baseFee}</span>
                                    <span>Uni: {b.universityFee}</span>
                                  </div>
                                </div>
                              ))}
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
                        {form.admissionSessionId !== '__none__' && <Badge variant="outline" className="bg-amber-50 text-amber-700">{sessions.find(s => s.id === form.admissionSessionId)?.name}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Level <span className="text-destructive">*</span></Label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.level} onChange={(e) => setForm({...form, level: e.target.value})} disabled>
                        <option value="program">Program</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label>Billing Cycle <span className="text-destructive">*</span></Label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.billingCycle} onChange={(e) => setForm({...form, billingCycle: e.target.value})}>
                        <option value="per_year">Per Year</option>
                        <option value="per_semester">Per Semester</option>
                        <option value="full_program">Full Program (One Time)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Total Program Fee <span className="text-muted-foreground text-xs">(optional display)</span></Label>
                      <Input type="number" min="0" value={form.fullProgramFee} onChange={(e) => setForm({...form, fullProgramFee: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>Base Fee (Tuition) per {form.billingCycle === 'per_semester' ? 'Sem' : 'Year'} <span className="text-destructive">*</span></Label>
                      <Input type="number" min="0" required value={form.baseFee} onChange={(e) => setForm({...form, baseFee: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label>University Fee per {form.billingCycle === 'per_semester' ? 'Sem' : 'Year'}</Label>
                      <Input type="number" min="0" value={form.universityFee} onChange={(e) => setForm({...form, universityFee: e.target.value})} />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base font-semibold">Fee Breakdown / Installments</Label>
                      <span className="text-xs text-muted-foreground">Auto-generated based on program duration and billing cycle.</span>
                    </div>
                    <div className="space-y-3">
                      {form.feeBreakdown.map((b, idx) => (
                        <div key={idx} className="flex flex-wrap items-end gap-2 p-3 border rounded-md bg-slate-50 relative group">
                          <div className="w-full font-medium text-sm text-indigo-900 border-b pb-1 mb-1">{form.billingCycle === 'per_semester' ? 'Semester' : 'Year'} {b.year}</div>
                          
                          <div className="flex-1 min-w-[120px] space-y-1">
                            <Label className="text-xs">Tuition Fee</Label>
                            <Input type="number" value={b.baseFee} onChange={(e) => handleBreakdownChange(idx, 'baseFee', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="flex-1 min-w-[120px] space-y-1">
                            <Label className="text-xs">University Fee</Label>
                            <Input type="number" value={b.universityFee} onChange={(e) => handleBreakdownChange(idx, 'universityFee', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="flex-1 min-w-[120px] space-y-1">
                            <Label className="text-xs">Exam Fee</Label>
                            <Input type="number" value={b.examFee} onChange={(e) => handleBreakdownChange(idx, 'examFee', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="flex-1 min-w-[120px] space-y-1">
                            <Label className="text-xs">Commission Rate (%)</Label>
                            <Input type="number" value={b.commissionRate} onChange={(e) => handleBreakdownChange(idx, 'commissionRate', e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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
