import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  User, Mail, Phone, Briefcase, Building2, Calendar,
  DollarSign, Target, TrendingUp, Star, Plus, Trash2, Edit,
  Save, RefreshCw, Award, AlertCircle, FileText, Upload,
  ExternalLink, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPI {
  id?: string;
  title: string;
  description?: string;
  target: number;
  achieved: number;
  unit: string;
  period: string;
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

interface KRA {
  id?: string;
  area: string;
  description?: string;
  weightage: number;
  rating?: number;
  remarks?: string;
}

interface SalaryConfig {
  basicSalary?: number;
  allowances?: { hra?: number; da?: number; ta?: number; medical?: number; other?: number };
  deductions?: { pf?: number; esi?: number; tds?: number; other?: number };
  lateDeductionPerMinute?: number;
}

interface ProfileData {
  profile: any;
  user: any;
  salaryConfig: SalaryConfig | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KPI_STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-blue-100 text-blue-700',
  at_risk: 'bg-yellow-100 text-yellow-700',
  achieved: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-700',
};

function StarRating({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn('transition-colors', onChange ? 'cursor-pointer' : 'cursor-default')}
        >
          <Star className={cn('w-4 h-4', n <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export function EmployeeProfilePanel({ userId, open, onClose }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');

  // Edit states
  const [personalForm, setPersonalForm] = useState<any>({});
  const [employmentForm, setEmploymentForm] = useState<any>({});
  const [salaryForm, setSalaryForm] = useState<any>({});
  const [salaryConfigForm, setSalaryConfigForm] = useState<SalaryConfig>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [kras, setKras] = useState<KRA[]>([]);
  const [reviewForm, setReviewForm] = useState<any>({});

  // Document upload dialog
  const [uploadDocDialogOpen, setUploadDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Aadhar Card');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // KPI/KRA dialog
  const [kpiDialog, setKpiDialog] = useState(false);
  const [kraDialog, setKraDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<KPI | null>(null);
  const [editKra, setEditKra] = useState<KRA | null>(null);
  const [kpiIdx, setKpiIdx] = useState<number | null>(null);
  const [kraIdx, setKraIdx] = useState<number | null>(null);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/hr/employee-profiles/${userId}`);
      const d: ProfileData = res.data.data;
      setData(d);
      const p = d.profile || {};
      const u = d.user || {};
      const ec = p.emergencyContact || {};
      setPersonalForm({
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        gender: p.gender || '',
        bloodGroup: p.bloodGroup || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        pincode: p.pincode || '',
        emergencyName: ec.name || '',
        emergencyPhone: ec.phone || '',
        emergencyRelation: ec.relation || '',
      });
      setEmploymentForm({
        employeeCode: p.employeeCode || u.userId || '',
        joinDate: p.joinDate ? p.joinDate.split('T')[0] : '',
        confirmationDate: p.confirmationDate ? p.confirmationDate.split('T')[0] : '',
        probationEndDate: p.probationEndDate ? p.probationEndDate.split('T')[0] : '',
        employmentType: p.employmentType || 'full_time',
        workLocation: p.workLocation || '',
        designation: u.designation || '',
        phone: u.phone || '',
      });
      setSalaryForm({
        ctc: p.ctc || '',
        basicSalary: p.basicSalary || '',
        bankName: p.bankName || '',
        bankAccountNo: p.bankAccountNo || '',
        ifscCode: p.ifscCode || '',
        panNumber: p.panNumber || '',
        uanNumber: ec.uanNumber || '',
        previousEsiNumber: ec.previousEsiNumber || '',
        lwfNumber: ec.lwfNumber || '',
      });
      setDocuments(Array.isArray(p.documents) ? p.documents : []);
      const sc = d.salaryConfig || {};
      setSalaryConfigForm({
        basicSalary: (sc).basicSalary || 0,
        allowances: (sc).allowances || { hra: 0, da: 0, ta: 0, medical: 0, other: 0 },
        deductions: (sc).deductions || { pf: 0, esi: 0, tds: 0, other: 0 },
        lateDeductionPerMinute: (sc).lateDeductionPerMinute || 0,
      });
      setKpis(p.kpis || []);
      setKras(p.kras || []);
      setReviewForm({
        lastReviewDate: p.lastReviewDate ? p.lastReviewDate.split('T')[0] : '',
        nextReviewDate: p.nextReviewDate ? p.nextReviewDate.split('T')[0] : '',
        overallRating: p.overallRating || 0,
        reviewRemarks: p.reviewRemarks || '',
      });
    } catch {
      toast.error('Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) { setTab('overview'); fetchProfile(); }
  }, [open, userId]);

  // ─── Save handlers ────────────────────────────────────────────────────────
  const savePersonal = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, {
        dateOfBirth: personalForm.dateOfBirth || undefined,
        gender: personalForm.gender || undefined,
        bloodGroup: personalForm.bloodGroup || undefined,
        address: personalForm.address,
        city: personalForm.city,
        state: personalForm.state,
        pincode: personalForm.pincode,
        emergencyContact: {
          name: personalForm.emergencyName,
          phone: personalForm.emergencyPhone,
          relation: personalForm.emergencyRelation,
        },
      });
      toast.success('Personal info saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveEmployment = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put(`/hr/employee-profiles/${userId}`, {
          employeeCode: employmentForm.employeeCode,
          joinDate: employmentForm.joinDate || undefined,
          confirmationDate: employmentForm.confirmationDate || undefined,
          probationEndDate: employmentForm.probationEndDate || undefined,
          employmentType: employmentForm.employmentType,
          workLocation: employmentForm.workLocation,
        }),
        api.put(`/users/${userId}`, {
          designation: employmentForm.designation,
          phone: employmentForm.phone,
        }),
      ]);
      toast.success('Employment info saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveSalary = async () => {
    setSaving(true);
    try {
      await api.patch(`/hr/employee-profiles/${userId}/salary`, {
        ...salaryForm,
        salaryConfig: salaryConfigForm,
      });
      toast.success('Salary details saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveKPIs = async () => {
    setSaving(true);
    try {
      await api.patch(`/hr/employee-profiles/${userId}/kpis`, { kpis });
      toast.success('KPIs saved');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveKRAs = async () => {
    setSaving(true);
    try {
      await api.patch(`/hr/employee-profiles/${userId}/kras`, { kras });
      toast.success('KRAs saved');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveReview = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, reviewForm);
      toast.success('Review saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  // ─── Document handlers (Req 32) ───────────────────────────────────────────
  const handleUploadDocument = async () => {
    if (!docFile) {
      toast.error('Please choose a document file to upload');
      return;
    }
    setUploadingDoc(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', docFile);
      const res = await api.post('/enrollment/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data?.url || res.data?.fileUrl || res.data?.data?.url;
      if (!fileUrl) throw new Error('File URL not returned');

      const newDoc = {
        id: Date.now().toString(),
        title: docTitle.trim() || docCategory,
        category: docCategory,
        url: fileUrl,
        fileName: docFile.name,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = [...documents, newDoc];
      await api.put(`/hr/employee-profiles/${userId}`, { documents: updatedDocs });
      setDocuments(updatedDocs);
      toast.success('Document uploaded successfully');
      setUploadDocDialogOpen(false);
      setDocTitle('');
      setDocFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docIdOrIndex: string | number) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      const updatedDocs = documents.filter((doc, idx) => (doc.id ? doc.id !== docIdOrIndex : idx !== docIdOrIndex));
      await api.put(`/hr/employee-profiles/${userId}`, { documents: updatedDocs });
      setDocuments(updatedDocs);
      toast.success('Document removed');
    } catch {
      toast.error('Failed to remove document');
    }
  };

  // ─── KPI helpers ──────────────────────────────────────────────────────────
  const openAddKpi = () => { setEditKpi({ title: '', target: 100, achieved: 0, unit: '%', period: '', status: 'on_track' }); setKpiIdx(null); setKpiDialog(true); };
  const openEditKpi = (kpi: KPI, idx: number) => { setEditKpi({ ...kpi }); setKpiIdx(idx); setKpiDialog(true); };
  const saveKpiDialog = () => {
    if (!editKpi) return;
    const updated = [...kpis];
    if (kpiIdx !== null) updated[kpiIdx] = editKpi; else updated.push(editKpi);
    setKpis(updated);
    setKpiDialog(false);
  };
  const removeKpi = (idx: number) => setKpis(kpis.filter((_, i) => i !== idx));

  // ─── KRA helpers ──────────────────────────────────────────────────────────
  const openAddKra = () => { setEditKra({ area: '', weightage: 10, rating: undefined }); setKraIdx(null); setKraDialog(true); };
  const openEditKra = (kra: KRA, idx: number) => { setEditKra({ ...kra }); setKraIdx(idx); setKraDialog(true); };
  const saveKraDialog = () => {
    if (!editKra) return;
    const updated = [...kras];
    if (kraIdx !== null) updated[kraIdx] = editKra; else updated.push(editKra);
    setKras(updated);
    setKraDialog(false);
  };
  const removeKra = (idx: number) => setKras(kras.filter((_, i) => i !== idx));

  const totalKraWeightage = kras.reduce((s, k) => s + (k.weightage || 0), 0);
  const avgKraRating = kras.filter(k => k.rating).length
    ? (kras.reduce((s, k) => s + (k.rating || 0), 0) / kras.filter(k => k.rating).length).toFixed(1)
    : '—';

  const user = data?.user;
  const profile = data?.profile;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5 border-b">
          <SheetHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold truncate">{user?.name || 'Employee Profile'}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{user?.designation || user?.role?.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {user?.departmentId?.name && (
                    <Badge variant="outline" className="text-xs"><Building2 className="w-3 h-3 mr-1" />{user.departmentId.name}</Badge>
                  )}
                  <Badge className={cn('text-xs', user?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                    {user?.status?.replace('_', ' ')}
                  </Badge>
                  {profile?.employmentType && (
                    <Badge variant="outline" className="text-xs capitalize">{profile.employmentType.replace('_', ' ')}</Badge>
                  )}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={fetchProfile} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
            <TabsList className="flex-wrap h-auto gap-1 mx-6 mt-4 justify-start bg-transparent border-b rounded-none pb-0">
              {['overview', 'personal', 'employment', 'salary', 'documents', 'kpi', 'kra', 'review'].map(t => (
                <TabsTrigger key={t} value={t} className="capitalize rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  {t === 'kpi' ? 'KPI' : t === 'kra' ? 'KRA' : t === 'documents' ? 'Documents' : t.charAt(0).toUpperCase() + t.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── OVERVIEW ── */}
              <TabsContent value="overview" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card><CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact</p>
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{user?.email}</div>
                    {user?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{user.phone}</div>}
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Employment</p>
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" />{profile?.employeeCode || user?.userId || '—'}</div>
                    {profile?.joinDate && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />Joined {new Date(profile.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  </CardContent></Card>
                </div>

                {/* KPI Summary */}
                {kpis.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />KPI Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {kpis.map((kpi, i) => {
                        const pct = Math.min(100, Math.round((kpi.achieved / kpi.target) * 100));
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{kpi.title}</span>
                              <span className="text-muted-foreground">{kpi.achieved}/{kpi.target} {kpi.unit}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-yellow-500')} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* KRA Summary */}
                {kras.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" />KRA Summary · Avg Rating: {avgKraRating}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {kras.map((kra, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <div>
                              <p className="text-sm font-medium">{kra.area}</p>
                              <p className="text-xs text-muted-foreground">Weightage: {kra.weightage}%</p>
                            </div>
                            <StarRating value={kra.rating} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review info */}
                {(profile?.overallRating || profile?.nextReviewDate) && (
                  <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overall Rating</p>
                        <StarRating value={profile.overallRating} />
                      </div>
                      {profile.nextReviewDate && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Next Review</p>
                          <p className="text-sm font-medium">{new Date(profile.nextReviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── PERSONAL ── */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <SectionTitle icon={User} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Date of Birth</Label><Input type="date" value={personalForm.dateOfBirth} onChange={e => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })} /></div>
                  <div><Label>Gender</Label>
                    <Select value={personalForm.gender} onValueChange={v => setPersonalForm({ ...personalForm, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Blood Group</Label><Input value={personalForm.bloodGroup} onChange={e => setPersonalForm({ ...personalForm, bloodGroup: e.target.value })} placeholder="A+, B-, O+" /></div>
                  <div className="col-span-2"><Label>Address</Label><Input value={personalForm.address} onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })} /></div>
                  <div><Label>City</Label><Input value={personalForm.city} onChange={e => setPersonalForm({ ...personalForm, city: e.target.value })} /></div>
                  <div><Label>State</Label><Input value={personalForm.state} onChange={e => setPersonalForm({ ...personalForm, state: e.target.value })} /></div>
                  <div><Label>Pincode</Label><Input value={personalForm.pincode} onChange={e => setPersonalForm({ ...personalForm, pincode: e.target.value })} /></div>
                </div>
                <SectionTitle icon={AlertCircle} title="Emergency Contact" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Name</Label><Input value={personalForm.emergencyName} onChange={e => setPersonalForm({ ...personalForm, emergencyName: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={personalForm.emergencyPhone} onChange={e => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })} /></div>
                  <div><Label>Relation</Label><Input value={personalForm.emergencyRelation} onChange={e => setPersonalForm({ ...personalForm, emergencyRelation: e.target.value })} placeholder="Spouse, Parent..." /></div>
                </div>
                <Button onClick={savePersonal} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save Personal Info</Button>
              </TabsContent>

              {/* ── EMPLOYMENT ── */}
              <TabsContent value="employment" className="space-y-4 mt-0">
                <SectionTitle icon={Briefcase} title="Employment Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Employee Code</Label><Input value={employmentForm.employeeCode} onChange={e => setEmploymentForm({ ...employmentForm, employeeCode: e.target.value })} /></div>
                  <div><Label>Designation</Label><Input value={employmentForm.designation} onChange={e => setEmploymentForm({ ...employmentForm, designation: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={employmentForm.phone} onChange={e => setEmploymentForm({ ...employmentForm, phone: e.target.value })} /></div>
                  <div><Label>Employment Type</Label>
                    <Select value={employmentForm.employmentType} onValueChange={v => setEmploymentForm({ ...employmentForm, employmentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Join Date</Label><Input type="date" value={employmentForm.joinDate} onChange={e => setEmploymentForm({ ...employmentForm, joinDate: e.target.value })} /></div>
                  <div><Label>Confirmation Date</Label><Input type="date" value={employmentForm.confirmationDate} onChange={e => setEmploymentForm({ ...employmentForm, confirmationDate: e.target.value })} /></div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Probation End Date</Label>
                    <Input
                      type="date"
                      value={employmentForm.probationEndDate}
                      onChange={e => setEmploymentForm({ ...employmentForm, probationEndDate: e.target.value })}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground font-medium">Quick Probation Duration:</span>
                      <button
                        type="button"
                        className="text-[11px] px-2.5 py-0.5 rounded-full border bg-muted/60 hover:bg-primary hover:text-primary-foreground font-medium transition-colors"
                        onClick={() => {
                          const base = employmentForm.joinDate ? new Date(employmentForm.joinDate) : new Date();
                          const d = new Date(base);
                          d.setMonth(d.getMonth() + 6);
                          setEmploymentForm((prev: any) => ({ ...prev, probationEndDate: d.toISOString().split('T')[0] }));
                          toast.info('Probation set to 6 Months (Executive)');
                        }}
                      >
                        6 Months (Executive)
                      </button>
                      <button
                        type="button"
                        className="text-[11px] px-2.5 py-0.5 rounded-full border bg-muted/60 hover:bg-primary hover:text-primary-foreground font-medium transition-colors"
                        onClick={() => {
                          const base = employmentForm.joinDate ? new Date(employmentForm.joinDate) : new Date();
                          const d = new Date(base);
                          d.setMonth(d.getMonth() + 3);
                          setEmploymentForm((prev: any) => ({ ...prev, probationEndDate: d.toISOString().split('T')[0] }));
                          toast.info('Probation set to 3 Months (Manager)');
                        }}
                      >
                        3 Months (Manager)
                      </button>
                      <button
                        type="button"
                        className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/60 text-muted-foreground hover:text-foreground"
                        onClick={() => setEmploymentForm((prev: any) => ({ ...prev, probationEndDate: '' }))}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2"><Label>Work Location</Label><Input value={employmentForm.workLocation} onChange={e => setEmploymentForm({ ...employmentForm, workLocation: e.target.value })} placeholder="Head Office, Remote..." /></div>
                </div>
                <Button onClick={saveEmployment} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save Employment Info</Button>
              </TabsContent>

              {/* ── SALARY (Req 8, 9, 40) ── */}
              <TabsContent value="salary" className="space-y-4 mt-0">
                <SectionTitle icon={DollarSign} title="Salary & Bank Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>CTC (Annual ₹)</Label><Input type="number" value={salaryForm.ctc} onChange={e => setSalaryForm({ ...salaryForm, ctc: e.target.value })} /></div>
                  <div><Label>Basic Salary (Monthly ₹)</Label><Input type="number" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} /></div>
                  <div><Label>Bank Name</Label><Input value={salaryForm.bankName} onChange={e => setSalaryForm({ ...salaryForm, bankName: e.target.value })} /></div>
                  <div><Label>Account Number</Label><Input value={salaryForm.bankAccountNo} onChange={e => setSalaryForm({ ...salaryForm, bankAccountNo: e.target.value })} /></div>
                  <div><Label>IFSC Code</Label><Input value={salaryForm.ifscCode} onChange={e => setSalaryForm({ ...salaryForm, ifscCode: e.target.value })} /></div>
                  <div><Label>PAN Number</Label><Input value={salaryForm.panNumber} onChange={e => setSalaryForm({ ...salaryForm, panNumber: e.target.value })} /></div>
                  {/* Req 40: Statutory identifiers */}
                  <div><Label>UAN (PF Number)</Label><Input value={salaryForm.uanNumber || ''} onChange={e => setSalaryForm({ ...salaryForm, uanNumber: e.target.value })} placeholder="12-digit UAN" /></div>
                  <div><Label>Previous ESI Number</Label><Input value={salaryForm.previousEsiNumber || ''} onChange={e => setSalaryForm({ ...salaryForm, previousEsiNumber: e.target.value })} placeholder="17-digit ESI No." /></div>
                  <div className="sm:col-span-2"><Label>LWF Number</Label><Input value={salaryForm.lwfNumber || ''} onChange={e => setSalaryForm({ ...salaryForm, lwfNumber: e.target.value })} placeholder="Labour Welfare Fund No." /></div>
                </div>

                <SectionTitle icon={TrendingUp} title="Salary Structure (Payroll Config)" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Basic (₹/mo)</Label><Input type="number" value={salaryConfigForm.basicSalary || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, basicSalary: Number(e.target.value) })} /></div>
                  <div><Label>HRA (₹)</Label><Input type="number" value={salaryConfigForm.allowances?.hra || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, allowances: { ...salaryConfigForm.allowances, hra: Number(e.target.value) } })} /></div>
                  <div><Label>DA (₹)</Label><Input type="number" value={salaryConfigForm.allowances?.da || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, allowances: { ...salaryConfigForm.allowances, da: Number(e.target.value) } })} /></div>
                  <div><Label>TA (₹)</Label><Input type="number" value={salaryConfigForm.allowances?.ta || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, allowances: { ...salaryConfigForm.allowances, ta: Number(e.target.value) } })} /></div>
                  <div><Label>Medical (₹)</Label><Input type="number" value={salaryConfigForm.allowances?.medical || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, allowances: { ...salaryConfigForm.allowances, medical: Number(e.target.value) } })} /></div>
                  <div><Label>Other Allowance (₹)</Label><Input type="number" value={salaryConfigForm.allowances?.other || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, allowances: { ...salaryConfigForm.allowances, other: Number(e.target.value) } })} /></div>
                  <div><Label>PF Deduction (₹)</Label><Input type="number" value={salaryConfigForm.deductions?.pf || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, deductions: { ...salaryConfigForm.deductions, pf: Number(e.target.value) } })} /></div>
                  <div><Label>ESI (₹)</Label><Input type="number" value={salaryConfigForm.deductions?.esi || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, deductions: { ...salaryConfigForm.deductions, esi: Number(e.target.value) } })} /></div>
                  <div><Label>TDS (₹)</Label><Input type="number" value={salaryConfigForm.deductions?.tds || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, deductions: { ...salaryConfigForm.deductions, tds: Number(e.target.value) } })} /></div>
                  <div><Label>Late Deduction (₹/min)</Label><Input type="number" step="0.01" value={salaryConfigForm.lateDeductionPerMinute || ''} onChange={e => setSalaryConfigForm({ ...salaryConfigForm, lateDeductionPerMinute: Number(e.target.value) })} /></div>
                </div>

                {/* Gross / Net preview */}
                {(salaryConfigForm.basicSalary || 0) > 0 && (() => {
                  const gross = (salaryConfigForm.basicSalary || 0) + Object.values(salaryConfigForm.allowances || {}).reduce((s, v) => s + (v || 0), 0);
                  const net = gross - Object.values(salaryConfigForm.deductions || {}).reduce((s, v) => s + (v || 0), 0);
                  return (
                    <div className="flex gap-4 p-3 rounded-xl bg-muted/50 text-sm">
                      <div><span className="text-muted-foreground">Gross: </span><span className="font-bold">₹{gross.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Net: </span><span className="font-bold text-green-600">₹{net.toLocaleString()}</span></div>
                    </div>
                  );
                })()}

                <Button onClick={saveSalary} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save Salary Details</Button>
              </TabsContent>

              {/* ── DOCUMENTS (Req 32) ── */}
              <TabsContent value="documents" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={FileText} title={`Employee Documents (${documents.length})`} />
                  <Button size="sm" onClick={() => setUploadDocDialogOpen(true)}><Plus className="w-4 h-4 mr-1" />Upload Document</Button>
                </div>

                {documents.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No employee documents uploaded yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload Aadhar, PAN card, degree certificates, experience letters, or resume.</p>
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => setUploadDocDialogOpen(true)}>
                      <Upload className="w-4 h-4 mr-1.5" />Upload First Document
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {documents.map((doc, idx) => (
                      <Card key={doc.id || idx} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{doc.title}</span>
                                {doc.category && <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {doc.fileName ? `${doc.fileName} · ` : ''}
                                Uploaded on {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />View
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteDocument(doc.id || idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Upload Document Dialog */}
                <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Employee Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label>Document Category</Label>
                        <Select value={docCategory} onValueChange={setDocCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                            <SelectItem value="PAN Card">PAN Card</SelectItem>
                            <SelectItem value="Educational Certificate">Educational Certificate / Degree</SelectItem>
                            <SelectItem value="Offer Letter">Offer Letter</SelectItem>
                            <SelectItem value="Relieving / Experience Letter">Relieving / Experience Letter</SelectItem>
                            <SelectItem value="Resume">Resume / CV</SelectItem>
                            <SelectItem value="Passport / ID Proof">Passport / Other ID</SelectItem>
                            <SelectItem value="Other">Other Document</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Document Title (Optional)</Label>
                        <Input
                          placeholder="e.g. Master's Degree, Aadhar Front & Back"
                          value={docTitle}
                          onChange={e => setDocTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Select File (PDF, Image, DOC)</Label>
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setDocFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)} disabled={uploadingDoc}>
                        Cancel
                      </Button>
                      <Button onClick={handleUploadDocument} disabled={uploadingDoc || !docFile}>
                        {uploadingDoc ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-1.5" /> Upload & Save
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* ── KPI ── */}
              <TabsContent value="kpi" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Target} title={`KPIs (${kpis.length})`} />
                  <Button size="sm" onClick={openAddKpi}><Plus className="w-4 h-4 mr-1" />Add KPI</Button>
                </div>
                {kpis.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No KPIs defined yet. Add the first one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kpis.map((kpi, i) => {
                      const pct = Math.min(100, Math.round((kpi.achieved / kpi.target) * 100));
                      return (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm">{kpi.title}</p>
                                {kpi.description && <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>}
                                <p className="text-xs text-muted-foreground mt-0.5">Period: {kpi.period}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className={cn('text-[10px]', KPI_STATUS_COLORS[kpi.status])}>{kpi.status.replace('_', ' ')}</Badge>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditKpi(kpi, i)}><Edit className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKpi(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-yellow-500')} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold min-w-[80px] text-right">{kpi.achieved}/{kpi.target} {kpi.unit} ({pct}%)</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {kpis.length > 0 && <Button onClick={saveKPIs} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save KPIs</Button>}
              </TabsContent>

              {/* ── KRA ── */}
              <TabsContent value="kra" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Award} title={`KRAs (${kras.length})`} />
                  <Button size="sm" onClick={openAddKra}><Plus className="w-4 h-4 mr-1" />Add KRA</Button>
                </div>
                {totalKraWeightage !== 100 && kras.length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Total weightage is {totalKraWeightage}% — should be 100%
                  </div>
                )}
                {kras.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                    <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No KRAs defined yet. Add key result areas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kras.map((kra, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{kra.area}</p>
                                <Badge variant="outline" className="text-[10px]">{kra.weightage}%</Badge>
                              </div>
                              {kra.description && <p className="text-xs text-muted-foreground mt-0.5">{kra.description}</p>}
                              <div className="flex items-center gap-3 mt-2">
                                <StarRating value={kra.rating} onChange={v => { const u = [...kras]; u[i] = { ...u[i], rating: v }; setKras(u); }} />
                                {kra.remarks && <p className="text-xs text-muted-foreground italic">"{kra.remarks}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditKra(kra, i)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKra(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {kras.length > 0 && <Button onClick={saveKRAs} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save KRAs</Button>}
              </TabsContent>

              {/* ── REVIEW ── */}
              <TabsContent value="review" className="space-y-4 mt-0">
                <SectionTitle icon={Star} title="Performance Review" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Last Review Date</Label><Input type="date" value={reviewForm.lastReviewDate} onChange={e => setReviewForm({ ...reviewForm, lastReviewDate: e.target.value })} /></div>
                  <div><Label>Next Review Date</Label><Input type="date" value={reviewForm.nextReviewDate} onChange={e => setReviewForm({ ...reviewForm, nextReviewDate: e.target.value })} /></div>
                </div>
                <div>
                  <Label className="mb-2 block">Overall Rating</Label>
                  <StarRating value={reviewForm.overallRating} onChange={v => setReviewForm({ ...reviewForm, overallRating: v })} />
                </div>
                <div>
                  <Label>Review Remarks</Label>
                  <Textarea rows={4} value={reviewForm.reviewRemarks} onChange={e => setReviewForm({ ...reviewForm, reviewRemarks: e.target.value })} placeholder="Performance summary, achievements, areas of improvement..." />
                </div>
                <Button onClick={saveReview} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />Save Review</Button>
              </TabsContent>

            </div>
          </Tabs>
        )}

        {/* KPI Dialog */}
        <Dialog open={kpiDialog} onOpenChange={setKpiDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{kpiIdx !== null ? 'Edit KPI' : 'Add KPI'}</DialogTitle></DialogHeader>
            {editKpi && (
              <div className="space-y-3 py-2">
                <div><Label>Title *</Label><Input value={editKpi.title} onChange={e => setEditKpi({ ...editKpi, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={editKpi.description || ''} onChange={e => setEditKpi({ ...editKpi, description: e.target.value })} /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div><Label>Target</Label><Input type="number" value={editKpi.target} onChange={e => setEditKpi({ ...editKpi, target: Number(e.target.value) })} /></div>
                  <div><Label>Achieved</Label><Input type="number" value={editKpi.achieved} onChange={e => setEditKpi({ ...editKpi, achieved: Number(e.target.value) })} /></div>
                  <div><Label>Unit</Label><Input value={editKpi.unit} onChange={e => setEditKpi({ ...editKpi, unit: e.target.value })} placeholder="%, ₹, count" /></div>
                </div>
                <div><Label>Period</Label><Input value={editKpi.period} onChange={e => setEditKpi({ ...editKpi, period: e.target.value })} placeholder="Q1 2025, FY 2025..." /></div>
                <div><Label>Status</Label>
                  <Select value={editKpi.status} onValueChange={v => setEditKpi({ ...editKpi, status: v as KPI['status'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="achieved">Achieved</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setKpiDialog(false)}>Cancel</Button>
              <Button onClick={saveKpiDialog} disabled={!editKpi?.title || !editKpi?.period}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KRA Dialog */}
        <Dialog open={kraDialog} onOpenChange={setKraDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{kraIdx !== null ? 'Edit KRA' : 'Add KRA'}</DialogTitle></DialogHeader>
            {editKra && (
              <div className="space-y-3 py-2">
                <div><Label>Key Result Area *</Label><Input value={editKra.area} onChange={e => setEditKra({ ...editKra, area: e.target.value })} placeholder="e.g. Customer Satisfaction, Revenue Growth" /></div>
                <div><Label>Description</Label><Input value={editKra.description || ''} onChange={e => setEditKra({ ...editKra, description: e.target.value })} /></div>
                <div><Label>Weightage (%)</Label><Input type="number" min={1} max={100} value={editKra.weightage} onChange={e => setEditKra({ ...editKra, weightage: Number(e.target.value) })} /></div>
                <div>
                  <Label className="mb-2 block">Rating (1–5)</Label>
                  <StarRating value={editKra.rating} onChange={v => setEditKra({ ...editKra, rating: v })} />
                </div>
                <div><Label>Remarks</Label><Textarea rows={2} value={editKra.remarks || ''} onChange={e => setEditKra({ ...editKra, remarks: e.target.value })} /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setKraDialog(false)}>Cancel</Button>
              <Button onClick={saveKraDialog} disabled={!editKra?.area}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SheetContent>
    </Sheet>
  );
}
