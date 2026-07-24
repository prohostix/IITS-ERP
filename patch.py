import re

file_path = "client/src/components/panels/ProgramFeeStructurePanel.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Update interfaces
content = content.replace(
    "additionalFees: { label: string; amount: number }[];",
    "additionalFees: { label: string; amount: number }[];\n  feeBreakdown?: any[];"
)
content = content.replace(
    "universityId: any;",
    "universityId: any;\n  duration?: number;"
)

# 2. Update `form` state
content = content.replace(
"""  const [form, setForm] = useState({ 
    level: 'program', // "program" or "university"
    programId: '', 
    universityId: '',
    admissionSessionId: '',
    billingCycle: 'per_year', 
    currency: 'INR', 
    registrationFee: '0',
    baseFee: '0', 
    examFee: '0',
    gstPercentage: '18',
    universityFee: '0',
    effectiveFrom: '', 
    additionalFees: '',
    commissionRate: '0'
  });""",
"""  const [form, setForm] = useState({ 
    level: 'program',
    programId: '', 
    universityId: '',
    admissionSessionId: '',
    billingCycle: 'per_year', 
    currency: 'INR', 
    effectiveFrom: '', 
    additionalFees: '',
    feeBreakdown: [] as any[]
  });"""
)

# 3. Add useEffect and handleBreakdownChange
insert_idx = content.find("const fetchAllData = useCallback(async () => {")
use_effect_code = """
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
                dueDate: ''
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

"""
content = content[:insert_idx] + use_effect_code + content[insert_idx:]

# 4. update openCreate
content = content.replace(
"""  const openCreate = () => {
    setEditing(null);
    setForm({ 
      level: 'program',
      programId: '', 
      universityId: selectedUniversityId !== 'all' ? selectedUniversityId : '',
      admissionSessionId: '',
      billingCycle: 'per_year', 
      currency: 'INR', 
      registrationFee: '0',
      baseFee: '0', 
      examFee: '0',
      gstPercentage: '18',
      universityFee: '0',
      effectiveFrom: '', 
      additionalFees: '',
      commissionRate: '0'
    });
    setOpen(true);
  };""",
"""  const openCreate = () => {
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
  };"""
)

# 5. update openEdit
content = content.replace(
"""  const openEdit = (fee: ProgramFee) => {
    setEditing(fee);
    
    // Parse individual fee fields from additionalFees or direct fields if exists
    const regFeeObj = fee.additionalFees?.find(f => f.label.toLowerCase() === 'registration fee');
    const examFeeObj = fee.additionalFees?.find(f => f.label.toLowerCase() === 'exam fee');
    const gstObj = fee.additionalFees?.find(f => f.label.toLowerCase() === 'gst');
    
    const otherFees = fee.additionalFees?.filter(
      f => !['registration fee', 'exam fee', 'gst'].includes(f.label.toLowerCase())
    ) || [];

    const progId = typeof fee.programId === 'object' ? fee.programId?.id : fee.programId;
    const uniId = typeof fee.universityId === 'object' ? fee.universityId?.id : fee.universityId;
    const sessId = typeof fee.admissionSessionId === 'object' ? fee.admissionSessionId?.id : fee.admissionSessionId;

    setForm({
      level: fee.level || 'program',
      programId: progId || '',
      universityId: uniId || '',
      admissionSessionId: sessId || '',
      baseFee: String(fee.baseFee),
      billingCycle: fee.billingCycle || 'per_year',
      currency: fee.currency,
      registrationFee: regFeeObj ? String(regFeeObj.amount) : '0',
      examFee: examFeeObj ? String(examFeeObj.amount) : '0',
      gstPercentage: gstObj ? String(gstObj.amount) : '18',
      universityFee: fee.universityFee ? String(fee.universityFee) : '0',
      effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.slice(0, 10) : '',
      additionalFees: otherFees.map(f => `${f.label}:${f.amount}`).join(', '),
      commissionRate: String(fee.commissionRate || 0),
    });
    setOpen(true);
  };""",
"""  const openEdit = (fee: ProgramFee) => {
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
  };"""
)

# 6. update handleSubmit
content = content.replace(
"""      // Compile helper fields into additionalFees array format
      const addFees = [];
      if (Number(form.registrationFee) > 0) {
        addFees.push({ label: 'Registration Fee', amount: Number(form.registrationFee) });
      }
      if (Number(form.examFee) > 0) {
        addFees.push({ label: 'Exam Fee', amount: Number(form.examFee) });
      }
      if (Number(form.gstPercentage) > 0) {
        addFees.push({ label: 'GST', amount: Number(form.gstPercentage) });
      }

      // Custom additional fees
      if (form.additionalFees) {
        const custom = form.additionalFees.split(',').map(s => {
          const [label, amount] = s.trim().split(':');
          return { label: label?.trim(), amount: Number(amount) };
        }).filter(f => f.label && !isNaN(f.amount));
        addFees.push(...custom);
      }

      const payload = {
        level: form.level,
        programId: form.level === 'program' ? form.programId : undefined,
        universityId: form.universityId || undefined,
        admissionSessionId: form.admissionSessionId || undefined,
        baseFee: Number(form.baseFee),
        universityFee: Number(form.universityFee),
        billingCycle: form.billingCycle,
        currency: form.currency,
        effectiveFrom: form.effectiveFrom || undefined,
        additionalFees: addFees,
        commissionRate: Number(form.commissionRate || 0),
      };""",
"""      const addFees = [];
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
      };"""
)

# 7. Update display blocks
display_find = """                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                              {fee.currency} {fee.baseFee.toLocaleString()} Tuition/Base
                            </Badge>
                            {fee.universityFee !== undefined && fee.universityFee > 0 && (
                              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                {fee.currency} {fee.universityFee.toLocaleString()} University Fee
                              </Badge>
                            )}
                            {fee.additionalFees.map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{f.label}: {f.amount}</Badge>
                            ))}
                            {fee.effectiveFrom && (
                              <span className="text-xs text-muted-foreground">Effective: {new Date(fee.effectiveFrom).toLocaleDateString()}</span>
                            )}
                          </div>"""
display_replace = """                          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                          )}"""
content = content.replace(display_find, display_replace)

# 8. Update form inputs
form_find = """            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Registration Fee</Label>
                <Input type="number" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Tuition / Base Fee</Label>
                <Input type="number" value={form.baseFee} onChange={e => setForm(f => ({ ...f, baseFee: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>University Fee</Label>
                <Input type="number" value={form.universityFee} onChange={e => setForm(f => ({ ...f, universityFee: e.target.value }))} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Exam Fee</Label>
                <Input type="number" value={form.examFee} onChange={e => setForm(f => ({ ...f, examFee: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>GST %</Label>
                <Input type="number" value={form.gstPercentage} onChange={e => setForm(f => ({ ...f, gstPercentage: e.target.value }))} placeholder="18" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" step="0.01" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} placeholder="0" />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label>Additional Fees <span className="text-muted-foreground text-xs">(label:amount, comma-separated)</span></Label>
              <Input value={form.additionalFees} onChange={e => setForm(f => ({ ...f, additionalFees: e.target.value }))} placeholder="Exam:200, Verification:100" />
            </div>"""

form_replace = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-1 mt-6">
              <Label>Additional Fees <span className="text-muted-foreground text-xs">(label:amount, comma-separated)</span></Label>
              <Input value={form.additionalFees} onChange={e => setForm(f => ({ ...f, additionalFees: e.target.value }))} placeholder="Verification:100" />
            </div>"""
content = content.replace(form_find, form_replace)

with open(file_path, "w") as f:
    f.write(content)

print("Patch applied")
