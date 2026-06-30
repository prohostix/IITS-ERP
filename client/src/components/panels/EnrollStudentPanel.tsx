import { useState, useEffect } from 'react';
import { GraduationCap, RefreshCw, Upload, Plus, Trash2, FileText, Edit, ShieldAlert, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Program {
  id: string;
  name: string;
  code: string;
  specialisations?: string[];
  university?: { id: string; name: string; code: string };
  programFeeStructure?: {
    baseFee: number;
    currency: string;
    billingCycle?: string;
    gstPercentage?: number;
    additionalFees: { label: string; amount: number }[];
  }[];
}

interface WalletData {
  balance: number;
}

interface EducationDetail {
  qualification: string;
  institution: string;
  passingYear: string;
  percentage: string;
}

interface DocumentFile {
  name: string;
  url: string;
}

interface Session {
  id: string;
  name: string;
  programId?: string | null;
}

export function EnrollStudentPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');

  // Get unique universities from the list of enrollable programs
  const uniqueUniversities = Array.from(
    new Map(
      programs
        .filter((p): p is Program & { university: { id: string; name: string; code: string } } => !!p.university)
        .map(p => [p.university.id, p.university])
    ).values()
  );

  const filteredPrograms = programs.filter(
    p => p.university?.id === selectedUniversityId
  );
  
  const [form, setForm] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    studentAddress: '',
    specialisation: ''
  });

  // Dynamic lists for documents and education details
  const [educationList, setEducationList] = useState<EducationDetail[]>([]);
  const [documentList, setDocumentList] = useState<DocumentFile[]>([]);
  
  // Single entry helper state for educational details form
  const [tempEdu, setTempEdu] = useState<EducationDetail>({
    qualification: '',
    institution: '',
    passingYear: '',
    percentage: ''
  });

  const [uploading, setUploading] = useState(false);
  
  // Confirmation Dialog Step
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes, walletRes, sessionsRes] = await Promise.all([
        api.get('/enrollment/programs'),
        api.get('/enrollment/wallet'),
        api.get('/enrollment/sessions'),
      ]);
      setPrograms(progsRes.data.data || []);
      setWallet(walletRes.data.data);
      setSessions(sessionsRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setSelectedSessionId('');
  }, [selectedProgram]);

  const availableSessions = sessions.filter(
    s => !selectedProgram || s.programId === null || s.programId === selectedProgram.id
  );

  const getTotalFee = (p: Program) => {
    if (!p.programFeeStructure || p.programFeeStructure.length === 0) return 0;
    const fs = p.programFeeStructure[0];
    const addFees = Array.isArray(fs.additionalFees) ? fs.additionalFees : [];
    const nonGstFees = addFees.filter(f => f.label !== 'GST');
    const subtotal = fs.baseFee + nonGstFees.reduce((s, f) => s + f.amount, 0);
    const gstEntry = addFees.find(f => f.label === 'GST');
    const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
    return subtotal + gstAmount;
  };

  const getBillingCycleText = (p: Program) => {
    if (!p.programFeeStructure || p.programFeeStructure.length === 0) return '';
    const cycle = p.programFeeStructure[0].billingCycle;
    if (cycle === 'per_year') return ' / year';
    if (cycle === 'per_semester') return ' / sem';
    if (cycle === 'full_program') return ' / program';
    return ` / ${cycle}`;
  };

  const handleAddEducation = () => {
    if (!tempEdu.qualification.trim() || !tempEdu.institution.trim() || !tempEdu.passingYear.trim()) {
      toast.error('Please fill qualification, institution, and passing year.');
      return;
    }
    setEducationList([...educationList, tempEdu]);
    setTempEdu({ qualification: '', institution: '', passingYear: '', percentage: '' });
  };

  const handleRemoveEducation = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/enrollment/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setDocumentList([...documentList, { name: res.data.filename || file.name, url: res.data.url }]);
        toast.success('Document uploaded successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentList(documentList.filter((_, i) => i !== index));
  };

  const triggerConfirm = () => {
    if (!selectedProgram) return;
    if (!selectedSessionId) {
      toast.error('Please select an intake admission session');
      return;
    }
    if (selectedProgram.specialisations && selectedProgram.specialisations.length > 0 && !form.specialisation.trim()) {
      toast.error('Please select a specialisation combo');
      return;
    }
    const missing = Object.entries(form)
      .filter(([k, v]) => k !== 'specialisation' && !v.trim())
      .map(([k]) => k);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(', ')}`);
      return;
    }
    setConfirmOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedProgram) return;
    if (!selectedSessionId) {
      toast.error('Please select an intake admission session');
      return;
    }
    if (selectedProgram.specialisations && selectedProgram.specialisations.length > 0 && !form.specialisation.trim()) {
      toast.error('Please select a specialisation combo');
      return;
    }
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      await api.post('/enrollment/enroll', { 
        ...form, 
        programId: selectedProgram.id,
        sessionId: selectedSessionId,
        documents: documentList,
        educationalDetails: educationList
      });
      toast.success('Enrollment submitted successfully');
      setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', specialisation: '' });
      setSelectedSessionId('');
      setEducationList([]);
      setDocumentList([]);
      setSelectedProgram(null);
      setSelectedUniversityId('');
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
            <CardTitle>Select University & Program</CardTitle>
            <CardDescription>First choose a university, then select a program</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : programs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No programs available for enrollment.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>University <span className="text-destructive">*</span></Label>
                  <select
                    value={selectedUniversityId}
                    onChange={e => {
                      setSelectedUniversityId(e.target.value);
                      setSelectedProgram(null);
                    }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Select University --</option>
                    {uniqueUniversities.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUniversityId && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-semibold">Available Programs</Label>
                    {filteredPrograms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No programs available under this university.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredPrograms.map(p => {
                          const total = getTotalFee(p);
                          const canAfford = balance >= total;
                          const isSelected = selectedProgram?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
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
                                  <p className="text-xs text-muted-foreground">{p.code} {p.university ? `• ${p.university.name}` : ''}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">
                                    ₹{total.toLocaleString()}
                                    <span className="text-[10px] text-muted-foreground font-normal lowercase">
                                      {getBillingCycleText(p)}
                                    </span>
                                  </p>
                                  {!canAfford && <Badge variant="destructive" className="text-[9px]">Insufficient</Badge>}
                                </div>
                              </div>
                              {p.programFeeStructure && p.programFeeStructure.length > 0 && p.programFeeStructure[0].additionalFees.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {p.programFeeStructure[0].additionalFees.map((f, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px]">
                                      {f.label === 'GST'
                                        ? `GST: ${f.amount}%`
                                        : `${f.label}: ₹${f.amount.toLocaleString()}`
                                      }
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Details */}
        <div className="space-y-6">
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
              {selectedProgram && (
                <div className="space-y-1">
                  <Label>Intake Admission Session <span className="text-destructive">*</span></Label>
                  <select
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">-- Select Intake Session --</option>
                    {availableSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedProgram && selectedProgram.specialisations && selectedProgram.specialisations.length > 0 && (
                <div className="space-y-1">
                  <Label>Specialisation Combo <span className="text-destructive">*</span></Label>
                  <select
                    value={form.specialisation}
                    onChange={e => setForm(f => ({ ...f, specialisation: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">-- Select Specialisation Combo --</option>
                    {selectedProgram.specialisations.map((spec, idx) => (
                      <option key={idx} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Educational Details */}
          <Card>
            <CardHeader>
              <CardTitle>Educational History</CardTitle>
              <CardDescription>Add the candidate's qualification credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {educationList.length > 0 && (
                <div className="space-y-2 border-b pb-4">
                  {educationList.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border text-sm">
                      <div>
                        <p className="font-semibold">{edu.qualification}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution} ({edu.passingYear}) {edu.percentage ? `· ${edu.percentage}%` : ''}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveEducation(idx)}>
                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Qualification</Label>
                  <Input 
                    placeholder="e.g. 10th / 12th / BCA" 
                    value={tempEdu.qualification} 
                    onChange={e => setTempEdu({ ...tempEdu, qualification: e.target.value })} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Institution</Label>
                  <Input 
                    placeholder="School / College Name" 
                    value={tempEdu.institution} 
                    onChange={e => setTempEdu({ ...tempEdu, institution: e.target.value })} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Passing Year</Label>
                  <Input 
                    placeholder="e.g. 2024" 
                    value={tempEdu.passingYear} 
                    onChange={e => setTempEdu({ ...tempEdu, passingYear: e.target.value })} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Percentage / CGPA (Optional)</Label>
                  <Input 
                    placeholder="e.g. 85%" 
                    value={tempEdu.percentage} 
                    onChange={e => setTempEdu({ ...tempEdu, percentage: e.target.value })} 
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full mt-1" onClick={handleAddEducation}>
                <Plus className="w-4 h-4 mr-2" /> Add Qualification
              </Button>
            </CardContent>
          </Card>

          {/* Upload Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents Upload</CardTitle>
              <CardDescription>Upload marksheets, identity proof, photo etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentList.length > 0 && (
                <div className="space-y-2 border-b pb-4">
                  {documentList.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border text-sm">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate font-medium">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline px-2">View</a>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDocument(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label className="block mb-2">Upload File</Label>
                <div className="relative border-2 border-dashed rounded-xl p-6 hover:bg-muted/30 transition-all flex flex-col items-center justify-center cursor-pointer">
                  <Input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileUpload} 
                    disabled={uploading} 
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">{uploading ? 'Uploading...' : 'Click or drag files here to upload'}</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>

              <Button
                className="w-full mt-4 premium-gradient text-white"
                onClick={triggerConfirm}
                disabled={!selectedProgram || submitting || (balance < getTotalFee(selectedProgram))}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                {submitting ? 'Enrolling...' : 'Submit Application'}
              </Button>
              {selectedProgram && balance < getTotalFee(selectedProgram) && (
                <p className="text-xs text-destructive text-center">Insufficient wallet balance. Please top up first.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation & Edit Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldAlert className="w-6 h-6 text-amber-500" /> Verify Application Details
            </DialogTitle>
            <DialogDescription>
              Please review all student details, educational history, and uploaded files carefully before submitting.
            </DialogDescription>
          </DialogHeader>

          {selectedProgram && (
            <div className="space-y-6 py-4">
              {/* Basic Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Basic Profile</h4>
                <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Student Name</span>
                    <span className="font-semibold text-foreground">{form.studentName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Email Address</span>
                    <span className="font-semibold text-foreground">{form.studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Phone Number</span>
                    <span className="font-semibold text-foreground">{form.studentPhone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Residential Address</span>
                    <span className="font-semibold text-foreground">{form.studentAddress}</span>
                  </div>
                </div>
              </div>

              {/* Course selection info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Program & Intake Selection</h4>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-primary">{selectedProgram.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Code: {selectedProgram.code} {selectedProgram.university ? `· University: ${selectedProgram.university.name}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-base text-primary">₹{getTotalFee(selectedProgram).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{getBillingCycleText(selectedProgram).replace('/', '')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Educational History</h4>
                {educationList.length > 0 ? (
                  <div className="space-y-2">
                    {educationList.map((edu, idx) => (
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
                  <p className="text-xs text-muted-foreground italic bg-muted/15 p-3 rounded-lg border">No educational history credentials provided.</p>
                )}
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Uploaded Proofs & Documents</h4>
                {documentList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {documentList.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-muted/10 p-2.5 rounded-lg border text-sm">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate font-medium">{doc.name}</span>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-semibold flex-shrink-0">View</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/15 p-3 rounded-lg border">No files uploaded.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" className="flex items-center gap-1.5" onClick={() => setConfirmOpen(false)}>
              <Edit className="w-4 h-4" /> Edit Details
            </Button>
            <Button className="premium-gradient text-white flex items-center gap-1.5" onClick={handleEnroll} disabled={submitting}>
              <Check className="w-4 h-4" /> Confirm & Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
