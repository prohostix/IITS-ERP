import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, IndianRupee, BookOpen, GraduationCap, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  additionalFees: { label: string; amount: number }[];
  feeBreakdown?: any[];
  currency: string;
  effectiveFrom: string;
  billingCycle?: string;
  registrationFee?: number;
  examFee?: number;
  gstPercentage?: number;
  universityFee?: number;
  commissionRate?: number;
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
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramFee | null>(null);
  
  // Dialog state for adding a program
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [subDepartments, setSubDepartments] = useState<{ id: string; name: string }[]>([]);
  const [specInput, setSpecInput] = useState('');
  
  const [newProgramForm, setNewProgramForm] = useState({
    name: '',
    code: '',
    universityId: '',
    subDepartmentId: '',
    courseType: 'Online Degree',
    duration: 12,
    status: 'active',
    hasSemesters: false,
    specialisations: [] as string[]
  });

  const [form, setForm] = useState({ 
    level: 'program',
    programId: '', 
    universityId: '',
    admissionSessionId: '',
    billingCycle: 'per_year', 
    currency: 'INR', 
    effectiveFrom: '', 
    additionalFees: '',
    feeBreakdown: [] as any[]
  });

  
  useEffect(() => {
    if (form.level === 'program' && form.programId) {
       const prog = programs.find(p => p.id === form.programId);
       if (prog) {
         let numBlocks = 1;
         const dur = prog.duration || 36;
         if (form.billingCycle === 'per_year') numBlocks = Math.max(1, Math.floor(dur / 12));
         else if (form.billingCycle === 'per_semester') numBlocks = Math.max(1, Math.floor(dur / 6));
         
         setForm(prev => {
            const newBreakdown = [...prev.feeBreakdown];
            while (newBreakdown.length < numBlocks) {
              newBreakdown.push({
                year: newBreakdown.length + 1,
                registrationFee: '0',
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
       }
    }
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
      if (unis.length > 0 && selectedUniversityId === 'all') {
        setSelectedUniversityId(unis[0].id);
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

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      level: 'program',
      programId: '', 
      universityId: selectedUniversityId !== 'all' ? selectedUniversityId : '',
      admissionSessionId: '',
      billingCycle: 'per_year', 
      currency: 'INR', 
      effectiveFrom: '', 
      additionalFees: '',
      feeBreakdown: []
    });
    setOpen(true);
  };

  const openEdit = (fee: ProgramFee) => {
    setEditing(fee);
    
    const otherFees = fee.additionalFees?.filter(
      f => !['registration fee', 'exam fee', 'gst'].includes(f.label.toLowerCase())
    ) || [];

    const progId = typeof fee.programId === 'object' ? fee.programId?.id : fee.programId;
    const uniId = typeof fee.universityId === 'object' ? fee.universityId?.id : fee.universityId;
    const sessId = typeof fee.admissionSessionId === 'object' ? fee.admissionSessionId?.id : fee.admissionSessionId;

    let parsedBreakdown = fee.feeBreakdown || [];
    if (parsedBreakdown.length > 0) {
       parsedBreakdown = parsedBreakdown.map((b: any) => ({
         year: b.year,
         registrationFee: String(b.registrationFee || '0'),
         baseFee: String(b.baseFee || '0'),
         universityFee: String(b.universityFee || '0'),
         examFee: String(b.examFee || '0'),
         commissionRate: String(b.commissionRate || '0'),
         dueDate: b.dueDate || ''
       }));
    }

    setForm({
      level: fee.level || 'program',
      programId: progId || '',
      universityId: uniId || '',
      admissionSessionId: sessId || '',
      billingCycle: fee.billingCycle || 'per_year',
      currency: fee.currency || 'INR',
      effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.slice(0, 10) : '',
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
      
      const cleanBreakdown = form.feeBreakdown.map(b => {
         totalBaseFee += Number(b.baseFee || 0);
         totalUniversityFee += Number(b.universityFee || 0);
         return {
           year: b.year,
           registrationFee: Number(b.registrationFee || 0),
           baseFee: Number(b.baseFee || 0),
           universityFee: Number(b.universityFee || 0),
           examFee: Number(b.examFee || 0),
           commissionRate: Number(b.commissionRate || 0),
           dueDate: b.dueDate
         };
      });

      const payload = {
        level: form.level,
        programId: form.level === 'program' ? form.programId : undefined,
        universityId: form.universityId || undefined,
        admissionSessionId: form.admissionSessionId || undefined,
        baseFee: totalBaseFee,
        universityFee: totalUniversityFee,
        billingCycle: form.billingCycle,
        currency: form.currency,
        effectiveFrom: form.effectiveFrom || undefined,
        additionalFees: addFees,
        feeBreakdown: cleanBreakdown,
        commissionRate: 0,
      };

      if (editing) {
        await api.put(`/finance/program-fees/${editing.id}`, payload);
        toast.success('Fee structure updated');
      } else {
        await api.post('/finance/program-fees', payload);
        toast.success('Fee structure created');
      }
      setOpen(false);
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

  // Program creation handlers
  const handleAddSpecialisation = () => {
    if (!specInput.trim()) return;
    if (newProgramForm.specialisations.includes(specInput.trim())) {
      toast.error('Specialisation already added');
      return;
    }
    setNewProgramForm(prev => ({
      ...prev,
      specialisations: [...prev.specialisations, specInput.trim()]
    }));
    setSpecInput('');
  };

  const handleRemoveSpecialisation = (spec: string) => {
    setNewProgramForm(prev => ({
      ...prev,
      specialisations: prev.specialisations.filter(s => s !== spec)
    }));
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProgramForm,
        subDepartmentId: newProgramForm.subDepartmentId || null
      };
      await api.post('/operations/programs', payload);
      toast.success('Program and specialisations created successfully');
      setProgramDialogOpen(false);
      
      setNewProgramForm({
        name: '',
        code: '',
        universityId: selectedUniversityId !== 'all' ? selectedUniversityId : '',
        subDepartmentId: '',
        courseType: 'Online Degree',
        duration: 12,
        status: 'active',
        hasSemesters: false,
        specialisations: []
      });
      
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create program');
    }
  };

  // Filter programs based on selected university
  const filteredPrograms = programs.filter(p => {
    const pUniId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
    return selectedUniversityId === 'all' || pUniId === selectedUniversityId;
  });

  // Filter programs based on selected university in the dialog form
  const dialogFilteredPrograms = programs.filter(p => {
    const pUniId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
    return !form.universityId || pUniId === form.universityId;
  });

  // Filter fee structures based on selected university
  const filteredFees = fees.filter(f => {
    if (f.level === 'university') {
      const uniId = typeof f.universityId === 'object' ? f.universityId?.id : f.universityId;
      return selectedUniversityId === 'all' || uniId === selectedUniversityId;
    }
    const prog = typeof f.programId === 'object' ? f.programId : programs.find(p => p.id === f.programId);
    if (!prog) return false;
    const pUniId = typeof prog.universityId === 'object' ? prog.universityId?.id : prog.universityId;
    return selectedUniversityId === 'all' || pUniId === selectedUniversityId;
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
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Program Fee Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure universities, programs, specialisations, and their associated fees in a unified panel.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => {
            setNewProgramForm(prev => ({
              ...prev,
              universityId: selectedUniversityId !== 'all' ? selectedUniversityId : ''
            }));
            setProgramDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />Add Program
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />Add Fee Structure
          </Button>
        </div>
      </div>

      {/* University Selector Card */}
      <Card className="bg-slate-50/50 dark:bg-slate-900/10">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="uni-select" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select University</Label>
            <Select value={selectedUniversityId} onValueChange={setSelectedUniversityId}>
              <SelectTrigger id="uni-select" className="w-full sm:w-[320px] bg-background">
                <SelectValue placeholder="Choose a university" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 text-sm mt-2 sm:mt-0">
            <div className="text-center px-4 py-2 border rounded-lg bg-background">
              <span className="block text-xl font-bold text-primary">{filteredPrograms.length}</span>
              <span className="text-xs text-muted-foreground">Programs</span>
            </div>
            <div className="text-center px-4 py-2 border rounded-lg bg-background">
              <span className="block text-xl font-bold text-emerald-600">{filteredFees.length}</span>
              <span className="text-xs text-muted-foreground">Fee Configs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Column: Programs & Specialisations list */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Programs List
              </CardTitle>
              <CardDescription>Academic courses and specialisations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : filteredPrograms.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No programs found for this university.</div>
              ) : (
                filteredPrograms.map(p => (
                  <div key={p.id} className="p-3 border rounded-lg bg-background space-y-2 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-semibold text-sm leading-none">{p.name}</h4>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{p.code}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0">{p.specialisations?.length || 0} Specialisations</Badge>
                    </div>
                    {p.specialisations && p.specialisations.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.specialisations.map((spec, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{spec}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Fee Structures */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" /> Program Fee Configurations
              </CardTitle>
              <CardDescription>Defined pricing structures for centers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
              ) : filteredFees.length === 0 ? (
                <div className="text-center py-16 border rounded-xl border-dashed text-muted-foreground">
                  No fee structures defined yet. Select a program and add pricing rules.
                </div>
              ) : (
                filteredFees.map(fee => {
                  const specs = getProgramSpecialisations(fee);
                  const sess = typeof fee.admissionSessionId === 'object' ? fee.admissionSessionId?.name : sessions.find(s => s.id === fee.admissionSessionId)?.name;
                  
                  return (
                    <Card key={fee.id} className="hover:border-primary/30 transition-all bg-background shadow-sm">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-base flex items-center gap-2">
                              {fee.level === 'university' ? <Building2 className="w-4 h-4 text-indigo-500" /> : <BookOpen className="w-4 h-4 text-blue-500" />}
                              {getProgramName(fee)}
                            </h4>
                            <Badge variant="outline" className="text-xs">{fee.billingCycle?.replace('_', ' ')}</Badge>
                            {sess && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-xs">{sess}</Badge>}
                          </div>
                          
                          {/* Specialisations listing in Fee Structure */}
                          {specs.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                                <GraduationCap className="w-3 h-3 text-primary" /> Specialisations:
                              </span>
                              {specs.map((s: string, idx: number) => (
                                <span key={idx} className="text-xs px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">{s}</span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                              {fee.currency || 'INR'} {fee.baseFee.toLocaleString()} Total Tuition
                            </Badge>
                            {fee.universityFee !== undefined && fee.universityFee > 0 && (
                              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                {fee.currency || 'INR'} {fee.universityFee.toLocaleString()} Total Uni Fee
                              </Badge>
                            )}
                            {fee.effectiveFrom && (
                              <span className="text-xs text-muted-foreground">Effective: {new Date(fee.effectiveFrom).toLocaleDateString()}</span>
                            )}
                          </div>
                          
                          {fee.feeBreakdown && fee.feeBreakdown.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fee.feeBreakdown.map((b: any, idx: number) => (
                                <div key={idx} className="p-2 bg-slate-50 border rounded-md text-xs">
                                  <div className="font-semibold mb-1">{fee.billingCycle === 'per_semester' ? 'Sem' : 'Year'} {b.year} <span className="font-normal text-muted-foreground ml-1">Due: {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}</span></div>
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                                    <span>Reg: {b.registrationFee}</span>
                                    <span>Tui: {b.baseFee}</span>
                                    <span>Uni: {b.universityFee}</span>
                                    <span>Exam: {b.examFee}</span>
                                    {b.commissionRate > 0 && <span className="col-span-2 text-indigo-600">Comm: {b.commissionRate}%</span>}
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
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Dialog for Program Creation with Multiple Specialisations */}
      <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Add New Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProgram} className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Program Name <span className="text-destructive">*</span></Label>
                <Input value={newProgramForm.name} onChange={e => setNewProgramForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MBA" required />
              </div>
              <div className="space-y-1">
                <Label>Program Code <span className="text-destructive">*</span></Label>
                <Input value={newProgramForm.code} onChange={e => setNewProgramForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MBA-ONLINE" required />
              </div>
            </div>

            <div className="space-y-1">
              <Label>University <span className="text-destructive">*</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={newProgramForm.universityId}
                onChange={e => setNewProgramForm(f => ({ ...f, universityId: e.target.value }))}
                required
              >
                <option value="">Select university</option>
                {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Sub-Department <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={newProgramForm.subDepartmentId}
                onChange={e => setNewProgramForm(f => ({ ...f, subDepartmentId: e.target.value }))}
              >
                <option value="">None</option>
                {subDepartments.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
              </select>
            </div>

            {/* Specialisations listing chips selection */}
            <div className="space-y-2">
              <Label>Specialisations <span className="text-muted-foreground text-xs">(optional — add multiple)</span></Label>
              <div className="flex gap-2">
                <Input 
                  value={specInput} 
                  onChange={e => setSpecInput(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialisation();
                    }
                  }}
                  placeholder="e.g. Computer Science, then press Enter" 
                />
                <Button type="button" onClick={handleAddSpecialisation} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Add
                </Button>
              </div>

              {newProgramForm.specialisations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {newProgramForm.specialisations.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
                      {spec}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSpecialisation(spec)} 
                        className="text-muted-foreground hover:text-destructive text-xs font-bold font-mono"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Course Type selector buttons/chips */}
            <div className="space-y-2">
              <Label>Course Type <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Skill Course', 'Online Degree', 'B.Voc Degree', 'Credit Transfer'].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={newProgramForm.courseType === type ? 'default' : 'outline'}
                    onClick={() => setNewProgramForm(f => ({ ...f, courseType: type }))}
                    className={`w-full text-sm font-medium ${newProgramForm.courseType === type ? 'bg-indigo-50 border-indigo-500 text-indigo-700 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration dropdown */}
            <div className="space-y-1">
              <Label>Duration <span className="text-destructive">*</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={newProgramForm.duration}
                onChange={e => setNewProgramForm(f => ({ ...f, duration: Number(e.target.value) }))}
                required
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={9}>9 months</option>
                <option value={11}>11 months</option>
                <option value={12}>1 year (12 months)</option>
                <option value={18}>1.5 years (18 months)</option>
                <option value={24}>2 years (24 months)</option>
                <option value={30}>2.5 years (30 months)</option>
                <option value={36}>3 years (36 months)</option>
                <option value={42}>3.5 years (42 months)</option>
                <option value={48}>4 years (48 months)</option>
              </select>
            </div>

            {/* Dialog Footer Actions */}
            <div className="pt-4 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProgramDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Program</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Fee Structure Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editing ? 'Edit Fee Structure' : 'Add New Fee Structure'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
            

            <div className="space-y-1">
              <Label>University <span className="text-destructive">*</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.universityId}
                onChange={e => setForm(f => ({ ...f, universityId: e.target.value }))}
                required
              >
                <option value="">Select university first</option>
                {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {form.level === 'program' && (
              <div className="space-y-1">
                <Label>Program <span className="text-destructive">*</span></Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.programId}
                  onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}
                  required
                >
                  <option value="">Select program...</option>
                  {dialogFilteredPrograms.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Admission Session</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.admissionSessionId}
                onChange={e => setForm(f => ({ ...f, admissionSessionId: e.target.value }))}
              >
                <option value="">Standard / All Sessions</option>
                {sessions
                  .filter(s => !form.universityId || !(s as any).universityId || (s as any).universityId === form.universityId)
                  .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Billing Cycle</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.billingCycle}
                  onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}
                >
                  <option value="per_semester">Per Semester</option>
                  <option value="per_year">Per Year</option>
                  <option value="total">Total (one-time)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="INR" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
            </div>

            {form.feeBreakdown && form.feeBreakdown.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg">{form.billingCycle === 'per_semester' ? 'Semester' : 'Yearly'} Fee Breakdown ({form.feeBreakdown.length} {form.billingCycle === 'per_semester' ? 'Semesters' : 'Years'})</h3>
                {form.feeBreakdown.map((block, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="font-medium text-emerald-700">{form.billingCycle === 'per_semester' ? 'Semester' : 'Year'} {block.year}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label>Registration Fee</Label>
                        <Input type="number" value={block.registrationFee} onChange={e => handleBreakdownChange(idx, 'registrationFee', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Tuition / Base Fee</Label>
                        <Input type="number" value={block.baseFee} onChange={e => handleBreakdownChange(idx, 'baseFee', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>University Fee</Label>
                        <Input type="number" value={block.universityFee} onChange={e => handleBreakdownChange(idx, 'universityFee', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Exam Fee</Label>
                        <Input type="number" value={block.examFee} onChange={e => handleBreakdownChange(idx, 'examFee', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Commission Rate (%)</Label>
                        <Input type="number" step="0.01" value={block.commissionRate} onChange={e => handleBreakdownChange(idx, 'commissionRate', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Payment Due Date</Label>
                        <Input type="date" value={block.dueDate} onChange={e => handleBreakdownChange(idx, 'dueDate', e.target.value)} />
                      </div>
                      <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <Label>Additional Fees <span className="text-muted-foreground text-xs">(label:amount, comma-separated)</span></Label>
                        <Input value={block.additionalFees || ''} onChange={e => handleBreakdownChange(idx, 'additionalFees', e.target.value)} placeholder="Verification:100, Library:50" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
