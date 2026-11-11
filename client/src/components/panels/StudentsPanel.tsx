import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, MapPin, Calendar, FileText, CreditCard, Check, Clock, CheckCircle, Eye, Download, ChevronDown, Table as TableIcon, LayoutList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter';
import { usePersistentFilters } from '@/hooks/usePersistentFilters';
import { RotateCcw } from 'lucide-react';

export interface StudentDisplayField {
  key: string;
  label: string;
  isDefault?: boolean;
}

export const STUDENT_DISPLAY_FIELDS: StudentDisplayField[] = [
  { key: 'sl_no', label: 'SL NO', isDefault: true },
  { key: 'admission_number', label: 'Admission Number', isDefault: true },
  { key: 'enrollment_number', label: 'Enrollment Number', isDefault: true },
  { key: 'reference_number', label: 'Reference Number' },
  { key: 'student_name', label: 'Student Name', isDefault: true },
  { key: 'course_type', label: 'Course Type' },
  { key: 'admission_mode', label: 'Admission Mode' },
  { key: 'university_board', label: 'University/Board', isDefault: true },
  { key: 'course_applied', label: 'Course Applied', isDefault: true },
  { key: 'specialization', label: 'Specialization' },
  { key: 'parent_name', label: 'Parent Name' },
  { key: 'mother_name', label: 'Mother Name' },
  { key: 'sex', label: 'Sex' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'mobile', label: 'Mobile', isDefault: true },
  { key: 'email', label: 'Email', isDefault: true },
  { key: 'present_address', label: 'Present Address' },
  { key: 'total_fee', label: 'Total Fee', isDefault: true },
  { key: 'discount', label: 'Discount' },
  { key: 'remitted_fee', label: 'Remitted Fee', isDefault: true },
  { key: 'balance_fee', label: 'Balance Fee', isDefault: true },
  { key: 'university_fee', label: 'University Fee' },
  { key: 'uni_fee_remitted', label: 'Uni Fee Remitted' },
  { key: 'uni_fee_balance', label: 'Uni Fee Balance' },
  { key: 'batch', label: 'Batch', isDefault: true },
  { key: 'class_duration', label: 'Class Duration' },
  { key: 'passout_year', label: 'Passout Year' },
  { key: 'passout_month', label: 'Passout Month' },
  { key: 'second_language', label: 'Second Language' },
  { key: 'place_subcenter', label: 'Place/Subcenter', isDefault: true },
  { key: 'date_of_join', label: 'Date of Join', isDefault: true },
  { key: 'valid_upto', label: 'Valid Upto' },
  { key: 'center_status', label: 'Center Status' },
  { key: 'status', label: 'Status', isDefault: true },
];

export const DEFAULT_DISPLAY_FIELD_KEYS = STUDENT_DISPLAY_FIELDS.filter(f => f.isDefault).map(f => f.key);
export const ALL_DISPLAY_FIELD_KEYS = STUDENT_DISPLAY_FIELDS.map(f => f.key);

const formatDateVal = (val: any): string => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getStudentDisplayFieldValue = (student: any, index: number, fieldKey: string): string => {
  const enrollment = student?.enrollments?.[0] || {};
  const program = student?.program || enrollment?.program || {};
  const university = program?.university || {};
  const center = student?.center || {};
  const session = enrollment?.session || {};

  // Resolve matching ProgramFeeStructure (same priority as financeLedgerReportsController)
  const pfsList: any[] = Array.isArray(program?.programFeeStructure)
    ? program.programFeeStructure
    : Array.isArray(program?.programFeeStructures)
      ? program.programFeeStructures
      : [];
  const sessionId = enrollment?.sessionId || student?.sessionId || session?.id;
  const spec = student?.specialisation || enrollment?.specialisation;
  const feeStruct =
    pfsList.find((f) => f.admissionSessionId === sessionId && f.specialisation === spec) ||
    pfsList.find((f) => !f.admissionSessionId && f.specialisation === spec) ||
    pfsList.find((f) => f.admissionSessionId === sessionId && !f.specialisation) ||
    pfsList.find((f) => !f.admissionSessionId && !f.specialisation) ||
    pfsList[0];

  // Parse feeBreakdown blocks for student's payment method
  let breakdowns: any[] = [];
  if (typeof feeStruct?.feeBreakdown === 'string') {
    try {
      breakdowns = JSON.parse(feeStruct.feeBreakdown);
    } catch (_e) {
      breakdowns = [];
    }
  } else if (Array.isArray(feeStruct?.feeBreakdown)) {
    breakdowns = feeStruct.feeBreakdown;
  }

  const payMethod = enrollment?.paymentMethod || enrollment?.paymentType;
  const hasTagged = breakdowns.some((b) => b?.installmentType === 'year' || b?.installmentType === 'semester');
  const filteredBlocks = hasTagged
    ? payMethod === 'semester'
      ? breakdowns.filter((b) => b?.installmentType === 'semester').length > 0
        ? breakdowns.filter((b) => b?.installmentType === 'semester')
        : breakdowns.filter((b) => b?.installmentType === 'year')
      : breakdowns.filter((b) => b?.installmentType === 'year').length > 0
        ? breakdowns.filter((b) => b?.installmentType === 'year')
        : breakdowns.filter((b) => b?.installmentType === 'semester')
    : breakdowns;

  // Calculate Student Fees & Discount (aligned with Finance Student Ledger)
  let fullProgramCalculated = 0;
  if (payMethod === 'full_payment' || enrollment?.paymentType === 'full_payment') {
    fullProgramCalculated = Number(feeStruct?.fullProgramFee || 0);
  }
  if (fullProgramCalculated <= 0 && filteredBlocks.length > 0) {
    fullProgramCalculated = filteredBlocks.reduce((sum: number, b: any) => {
      const addFee = Array.isArray(b?.additionalFees)
        ? b.additionalFees.reduce((s: number, f: any) => s + Number(f?.amount || 0), 0)
        : 0;
      return sum + Number(b?.baseFee || b?.tuitionFee || 0) + Number(b?.examFee || 0) + addFee;
    }, 0);
  }

  const extraFeesList: any[] = Array.isArray(enrollment?.extraFees) ? enrollment.extraFees : [];
  const positiveExtraFees = extraFeesList
    .filter((f) => Number(f?.amount || 0) > 0 && String(f?.type || '').toLowerCase() !== 'discount')
    .reduce((s, f) => s + Number(f?.amount || 0), 0);
  const extraDiscounts = extraFeesList
    .filter((f) => Number(f?.amount || 0) < 0 || String(f?.type || '').toLowerCase() === 'discount')
    .reduce((s, f) => s + Math.abs(Number(f?.amount || 0)), 0);

  const baseProgramFee =
    fullProgramCalculated > 0
      ? fullProgramCalculated
      : Number(feeStruct?.baseFee || enrollment?.totalFee || 0);
  const totalFee = baseProgramFee + positiveExtraFees;

  const receipts = Array.isArray(enrollment?.studentFeeReceipts) ? enrollment.studentFeeReceipts : [];
  const receiptsDiscount = receipts.reduce((sum: number, r: any) => sum + Number(r?.discount || 0), 0);
  const manualReceiptsPaid = receipts.reduce(
    (sum: number, r: any) => sum + Number(r?.amount ?? r?.amountPaid ?? 0),
    0
  );
  const walletPayment =
    enrollment?.paymentType === 'direct_to_university'
      ? 0
      : Number(enrollment?.payment?.amount ?? enrollment?.totalFee ?? 0);
  const remittedFee = manualReceiptsPaid + walletPayment;
  const discount = receiptsDiscount + extraDiscounts;
  const balanceFee = Math.max(0, totalFee - discount - remittedFee);

  // Calculate University Fees
  const uniPayments = Array.isArray(student?.universityFeePayments) ? student.universityFeePayments : [];
  const uniPaymentsTotal = uniPayments.reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0);
  const uniFeeRemitted = uniPayments
    .filter((p: any) => ['paid', 'completed', 'approved', 'success'].includes(String(p?.status || '').toLowerCase()))
    .reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0);

  let structUniFee = 0;
  if ((payMethod === 'full_payment' || enrollment?.paymentType === 'full_payment') && Number(feeStruct?.oneTimeUniversityFee || 0) > 0) {
    structUniFee = Number(feeStruct.oneTimeUniversityFee);
  } else if (filteredBlocks.length > 0) {
    structUniFee = filteredBlocks.reduce((sum: number, b: any) => sum + Number(b?.universityFee || 0), 0);
  }
  if (structUniFee <= 0) {
    structUniFee = Number(feeStruct?.universityFee || program?.feeStructure?.universityFee || 0);
  }
  const universityFee = Math.max(structUniFee, uniPaymentsTotal, uniFeeRemitted);
  const uniFeeBalance = Math.max(0, universityFee - uniFeeRemitted);

  // Duration / Passout / Valid Upto calculations (Program.duration in schema is stored in months, e.g. 24, 36)
  const joinRaw = student?.joinDate || enrollment?.admissionDate || enrollment?.createdAt || student?.createdAt;
  const joinDateObj = joinRaw ? new Date(joinRaw) : null;
  const rawDuration = program?.duration;
  const durNum = Number(rawDuration);
  const durationMonths = !isNaN(durNum) && durNum > 0 ? (durNum >= 6 ? durNum : durNum * 12) : 0;

  let formattedDuration = '-';
  if (!isNaN(durNum) && durNum > 0) {
    if (durNum >= 6) {
      const yrs = durNum / 12;
      const yrsLabel = Number.isInteger(yrs) ? `${yrs} ${yrs === 1 ? 'Year' : 'Years'}` : `${yrs.toFixed(1)} Years`;
      formattedDuration = `${durNum} Months (${yrsLabel})`;
    } else {
      formattedDuration = `${durNum} ${durNum === 1 ? 'Year' : 'Years'}`;
    }
  } else if (rawDuration) {
    formattedDuration = String(rawDuration);
  }

  let validUptoDate: Date | null = null;
  if (session?.endDate) {
    const ed = new Date(session.endDate);
    if (!isNaN(ed.getTime())) validUptoDate = ed;
  } else if (joinDateObj && !isNaN(joinDateObj.getTime()) && durationMonths > 0) {
    validUptoDate = new Date(joinDateObj);
    validUptoDate.setMonth(validUptoDate.getMonth() + durationMonths);
  }

  const formatAdmissionMode = (val: string | undefined): string => {
    if (!val) return 'Regular';
    const map: Record<string, string> = {
      full_payment: 'Full Payment',
      semester: 'Semester',
      yearly: 'Yearly',
      installment: 'Installment',
      wallet: 'Wallet',
      emi: 'EMI',
      direct_to_university: 'Direct to University',
    };
    return map[val] || val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  switch (fieldKey) {
    case 'sl_no':
      return String(index + 1);
    case 'admission_number':
      return student?.enrollmentNo || enrollment?.enrollmentNumber || '-';
    case 'enrollment_number':
      return student?.uniEnrollmentNumber || enrollment?.uniEnrollmentNumber || '-';
    case 'reference_number':
      return (
        student?.abcId ||
        enrollment?.abcId ||
        student?.debId ||
        enrollment?.debId ||
        receipts[0]?.referenceNo ||
        '-'
      );
    case 'student_name':
      return student?.name || enrollment?.studentName || '-';
    case 'course_type':
      return program?.courseType ? String(program.courseType).replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase() : '-';
    case 'admission_mode':
      return formatAdmissionMode(enrollment?.paymentMethod || enrollment?.paymentType);
    case 'university_board':
      return university?.name || session?.university?.name || '-';
    case 'course_applied':
      return program?.name || '-';
    case 'specialization':
      return student?.specialisation || enrollment?.specialisation || '-';
    case 'parent_name':
      return student?.fatherName || enrollment?.fatherName || '-';
    case 'mother_name':
      return student?.motherName || enrollment?.motherName || '-';
    case 'sex':
      return student?.gender || enrollment?.gender || '-';
    case 'dob':
      return formatDateVal(student?.dob || enrollment?.dob);
    case 'mobile':
      return student?.phone || enrollment?.studentPhone || '-';
    case 'email':
      return student?.email || enrollment?.studentEmail || '-';
    case 'present_address': {
      const addrParts = [
        student?.address || enrollment?.studentAddress || enrollment?.address,
        student?.city || enrollment?.city,
        student?.state || enrollment?.state,
        student?.pincode || enrollment?.pincode,
      ].filter(Boolean);
      return addrParts.length > 0 ? addrParts.join(', ') : '-';
    }
    case 'total_fee':
      return `₹${totalFee.toLocaleString('en-IN')}`;
    case 'discount':
      return `₹${discount.toLocaleString('en-IN')}`;
    case 'remitted_fee':
      return `₹${remittedFee.toLocaleString('en-IN')}`;
    case 'balance_fee':
      return `₹${balanceFee.toLocaleString('en-IN')}`;
    case 'university_fee':
      return `₹${universityFee.toLocaleString('en-IN')}`;
    case 'uni_fee_remitted':
      return `₹${uniFeeRemitted.toLocaleString('en-IN')}`;
    case 'uni_fee_balance':
      return `₹${uniFeeBalance.toLocaleString('en-IN')}`;
    case 'batch':
      return session?.name || '-';
    case 'class_duration':
      return formattedDuration;
    case 'passout_year':
      return validUptoDate ? String(validUptoDate.getFullYear()) : '-';
    case 'passout_month':
      return validUptoDate ? validUptoDate.toLocaleString('en-US', { month: 'long' }) : '-';
    case 'second_language':
      return student?.secondLanguage || enrollment?.secondLanguage || '-';
    case 'place_subcenter':
      return center?.name ? `${center.name}${center.city ? ` (${center.city})` : ''}` : '-';
    case 'date_of_join':
      return formatDateVal(joinRaw);
    case 'valid_upto':
      return validUptoDate ? formatDateVal(validUptoDate) : '-';
    case 'center_status':
      return center?.status ? String(center.status).replace(/_/g, ' ').toUpperCase() : 'ACTIVE';
    case 'status':
      return student?.status ? String(student.status).toUpperCase() : '-';
    default:
      return '-';
  }
};

export const getStudentPhotoUrl = (student: any): string | null => {
  if (!student) return null;
  let raw = student.studentPhoto;
  if (!raw && student.enrollments?.[0]?.studentPhoto) {
    raw = student.enrollments[0].studentPhoto;
  }
  if (!raw && Array.isArray(student.enrollments?.[0]?.documents)) {
    const photoDoc = student.enrollments[0].documents.find(
      (d: any) =>
        d.name?.toLowerCase().includes('photo') ||
        d.reqName?.toLowerCase().includes('photo')
    );
    if (photoDoc?.url) raw = photoDoc.url;
  }
  if (!raw && Array.isArray(student.documents)) {
    const photoDoc = student.documents.find(
      (d: any) =>
        d.name?.toLowerCase().includes('photo') ||
        d.reqName?.toLowerCase().includes('photo')
    );
    if (photoDoc?.url) raw = photoDoc.url;
  }

  if (!raw || typeof raw !== 'string') return null;
  raw = raw.trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return raw;
  }
  return `/uploads/${raw}`;
};

export function StudentsPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'center_admin'].includes(user?.role || '');
  const canDelete = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    enrollmentNo: '',
    programId: '',
    centerId: '',
    status: 'pending'
  });
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    active: 0,
    pending: 0,
    hold: 0,
    dropout: 0,
  });

  // Installments state
  const [installments, setInstallments] = useState<any[]>([]);
  const [fetchingInstallments, setFetchingInstallments] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState(false);
  const [payConfirmData, setPayConfirmData] = useState<{ installmentName: string, amount: number, message: string } | null>(null);

  // Status Change Request state
  const [requestStatusOpen, setRequestStatusOpen] = useState(false);
  const [requestedStatus, setRequestedStatus] = useState<'hold' | 'dropout'>('hold');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatusReq, setSubmittingStatusReq] = useState(false);

  // Select Student Display Field & Report state
  const [displayFieldsOpen, setDisplayFieldsOpen] = useState(false);
  const [selectedDisplayFields, setSelectedDisplayFields] = useState<string[]>(DEFAULT_DISPLAY_FIELD_KEYS);
  const [reportViewMode, setReportViewMode] = useState<'directory' | 'report'>('directory');

  const isAllDisplayFieldsChecked = selectedDisplayFields.length === ALL_DISPLAY_FIELD_KEYS.length;
  const isDefaultDisplayFieldsChecked =
    selectedDisplayFields.length === DEFAULT_DISPLAY_FIELD_KEYS.length &&
    DEFAULT_DISPLAY_FIELD_KEYS.every((k) => selectedDisplayFields.includes(k));

  const toggleDisplayField = (key: string) => {
    setSelectedDisplayFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCheckAllDisplayFields = (checked: boolean) => {
    setSelectedDisplayFields(checked ? [...ALL_DISPLAY_FIELD_KEYS] : []);
  };

  const handleCheckDefaultDisplayFields = (checked: boolean) => {
    setSelectedDisplayFields(checked ? [...DEFAULT_DISPLAY_FIELD_KEYS] : []);
  };

  const orderedSelectedFields = STUDENT_DISPLAY_FIELDS.filter((f) =>
    selectedDisplayFields.includes(f.key)
  );

  const handleGenerateStudentReport = () => {
    if (orderedSelectedFields.length === 0) {
      toast.error('Please select at least one display field to generate the report');
      return;
    }
    setReportViewMode('report');
    setDisplayFieldsOpen(false);
    toast.success(`Report generated with ${orderedSelectedFields.length} fields for ${students.length} students`);
  };

  const handleExportStudentReportCsv = () => {
    if (orderedSelectedFields.length === 0) {
      toast.error('Please select at least one display field to export');
      return;
    }
    if (students.length === 0) {
      toast.error('No students available to export');
      return;
    }
    const headers = orderedSelectedFields.map((f) => `"${f.label.replace(/"/g, '""')}"`);
    const rows = students.map((student, idx) =>
      orderedSelectedFields
        .map((f) => {
          const val = getStudentDisplayFieldValue(student, idx, f.key).replace(/^₹/, 'Rs. ');
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${students.length} students with ${orderedSelectedFields.length} columns`);
  };

  const handleRequestStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmittingStatusReq(true);
    try {
      await api.post(`/students/${selectedStudent.id}/status-request`, {
        requestedStatus,
        reason: statusReason
      });
      toast.success(`Request to ${requestedStatus} student submitted successfully!`);
      setRequestStatusOpen(false);
      setStatusReason('');
      setSelectedStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit status request');
    } finally {
      setSubmittingStatusReq(false);
    }
  };

  const [filters, , clearFilters, isFiltered, setField] = usePersistentFilters('students_panel', {
    status: '',
    sessions: [] as string[],
    universities: [] as string[],
    programs: [] as string[],
    centers: [] as string[],
    search: '',
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.status && filters.status !== 'all') query.append('status', filters.status);
      if (filters.universities && filters.universities.length > 0) query.append('universityId', filters.universities.join(','));
      if (filters.centers && filters.centers.length > 0) query.append('centerId', filters.centers.join(','));
      if (filters.programs && filters.programs.length > 0) query.append('programId', filters.programs.join(','));
      if (filters.sessions && filters.sessions.length > 0) query.append('sessionId', filters.sessions.join(','));
      if (filters.search) query.append('search', filters.search);
      
      const response = await api.get(`/students?${query.toString()}`);
      const list = response.data.data || [];
      setStudents(list);
      if (response.data.counts) {
        setStatusCounts(response.data.counts);
      } else {
        setStatusCounts({
          total: list.length,
          active: list.filter((s: any) => s.status === 'active').length,
          pending: list.filter((s: any) => s.status === 'pending').length,
          hold: list.filter((s: any) => s.status === 'hold').length,
          dropout: list.filter((s: any) => s.status === 'dropout').length,
        });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await api.get('/operations/programs');
      setPrograms(response.data.data || []);
    } catch (error) {
    }
  }, []);

  const fetchCenters = useCallback(async () => {
    try {
      const response = await api.get('/operations/centers');
      setCenters(response.data.data || []);
    } catch (error) {
    }
  }, []);

  const fetchUniversities = useCallback(async () => {
    try {
      const response = await api.get('/operations/universities');
      setUniversities(response.data.data || []);
    } catch (error) {
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/operations/sessions');
      setSessions(response.data.data || []);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchCenters();
    fetchUniversities();
    fetchSessions();
  }, [fetchStudents, fetchPrograms, fetchCenters, fetchUniversities, fetchSessions]);

  const fetchInstallments = async (studentId: string) => {
    setFetchingInstallments(true);
    try {
      const res = await api.get(`/students/${studentId}/installments`);
      setInstallments(res.data.installments || []);
    } catch (err) {
    } finally {
      setFetchingInstallments(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchInstallments(selectedStudent.id);
    } else {
      setInstallments([]);
    }
  }, [selectedStudent]);

  const handlePayInstallmentClick = (installmentName: string, amount: number) => {
    if (!selectedStudent) return;
    
    const uniCategory = selectedStudent.program?.university?.category;
    const isNoWallet = uniCategory === 'team_lease';
    
    const message = isNoWallet 
      ? `Are you sure you want to mark ₹${amount.toLocaleString()} for ${installmentName} as paid directly to the university?`
      : `Are you sure you want to pay ₹${amount.toLocaleString()} for ${installmentName} using your study center wallet?`;
      
    setPayConfirmData({ installmentName, amount, message });
  };

  const executePayInstallment = async () => {
    if (!selectedStudent || !payConfirmData) return;

    setPayingInstallment(true);
    try {
      await api.post(`/students/${selectedStudent.id}/pay-installment`, { installmentName: payConfirmData.installmentName, amount: payConfirmData.amount });
      toast.success(`${payConfirmData.installmentName} paid successfully!`);
      fetchInstallments(selectedStudent.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to pay installment');
    } finally {
      setPayingInstallment(false);
      setPayConfirmData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleEdit = (student: any) => {
    const studentId = student.id || student.id;
    const programId = typeof student.programId === 'object'
      ? (student.programId?.id || student.programId?.id)
      : student.programId;
    const centerId = typeof student.centerId === 'object'
      ? (student.centerId?.id || student.centerId?.id)
      : student.centerId;
    setEditingId(studentId);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      enrollmentNo: student.enrollmentNo || '',
      programId: programId?.toString() || '',
      centerId: centerId?.toString() || '',
      status: student.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      enrollmentNo: '',
      programId: '',
      centerId: '',
      status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Student Management</h2>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-full">
              {students.length} {students.length === 1 ? 'Student' : 'Students'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Manage student records and enrollments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status summary pill */}
          <div className="hidden md:flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Total: <strong className="font-bold text-primary">{statusCounts.total || students.length}</strong>
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
              Active: <strong>{statusCounts.active}</strong>
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              Pending: <strong>{statusCounts.pending}</strong>
            </span>
            {statusCounts.hold > 0 && (
              <>
                <span className="h-3 w-px bg-border" />
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                  Hold: <strong>{statusCounts.hold}</strong>
                </span>
              </>
            )}
            {statusCounts.dropout > 0 && (
              <>
                <span className="h-3 w-px bg-border" />
                <span className="text-rose-700 dark:text-rose-300 font-medium">
                  Dropout: <strong>{statusCounts.dropout}</strong>
                </span>
              </>
            )}
          </div>

          {canWrite && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm font-semibold"><Plus className="w-4 h-4 mr-2" />Add Student</Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                </div>
                <div>
                  <Label>Admission Number</Label>
                  <Input value={formData.enrollmentNo} onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Program</Label>
                    <Select value={formData.programId} onValueChange={(value) => setFormData({...formData, programId: value})}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {programs.filter(p => p && (p.id || p.id)).map((prog) => (
                          <SelectItem key={prog.id || prog.id} value={(prog.id || prog.id).toString()}>
                            {prog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Study Center</Label>
                    <Select value={formData.centerId} onValueChange={(value) => setFormData({...formData, centerId: value})}>
                      <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                      <SelectContent>
                        {centers.filter(c => c && (c.id || c.id)).map((center) => (
                          <SelectItem key={center.id || center.id} value={(center.id || center.id).toString()}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="dropout">Dropout</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { key: '', label: 'All', count: statusCounts.total || students.length, dot: 'bg-primary' },
            { key: 'active', label: 'Active', count: statusCounts.active, dot: 'bg-emerald-500' },
            { key: 'pending', label: 'Pending', count: statusCounts.pending, dot: 'bg-amber-500' },
            { key: 'hold', label: 'Hold', count: statusCounts.hold, dot: 'bg-indigo-500' },
            { key: 'dropout', label: 'Dropout', count: statusCounts.dropout, dot: 'bg-rose-500' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setField('status', tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                filters.status === tab.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/60 text-muted-foreground border-border hover:border-primary/40'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', tab.dot, filters.status === tab.key ? 'bg-white' : '')} />
              <span>{tab.label}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                filters.status === tab.key ? 'bg-primary-foreground/20 text-white' : 'bg-background text-muted-foreground border'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center ml-auto">
          {/* Sessions Multi-Select */}
          <MultiSelectFilter
            title="Sessions"
            placeholder="All Sessions"
            options={(() => {
              const hasUniFilter = filters.universities && filters.universities.length > 0;
              const mapped = sessions.map(s => {
                const uniName = s.university?.name || '';
                const uniCode = s.university?.code || '';
                const isMatch = hasUniFilter && (
                  filters.universities.includes(s.universityId) ||
                  (s.university?.id && filters.universities.includes(s.university.id))
                );
                return {
                  label: s.name,
                  value: s.id,
                  code: uniCode || (uniName ? uniName.slice(0, 6).toUpperCase() : undefined),
                  subtitle: uniName || 'University not assigned',
                  _match: isMatch ? 1 : 0
                };
              });

              if (hasUniFilter) {
                return mapped.sort((a, b) => b._match - a._match);
              }
              return mapped;
            })()}
            selectedValues={filters.sessions}
            onChange={(values) => setField('sessions', values)}
          />

          {/* Universities Multi-Select */}
          <MultiSelectFilter
            title="Universities"
            placeholder="All Universities"
            options={universities.map(u => ({ label: u.name, value: u.id, code: u.code }))}
            selectedValues={filters.universities}
            onChange={(values) => setField('universities', values)}
          />

          {/* Programs Multi-Select */}
          <MultiSelectFilter
            title="Programs"
            placeholder="All Programs"
            options={programs.filter(p => p && p.id).map(prog => ({
              label: prog.name,
              value: prog.id.toString(),
              code: prog.code || prog.university?.code,
              subtitle: prog.university?.name
            }))}
            selectedValues={filters.programs}
            onChange={(values) => setField('programs', values)}
          />

          {/* Study Centers Multi-Select */}
          {user?.role !== 'center_admin' && (
            <MultiSelectFilter
              title="Centers"
              placeholder="All Centers"
              options={centers.map(c => ({ label: c.name, value: c.id, code: c.code }))}
              selectedValues={filters.centers}
              onChange={(values) => setField('centers', values)}
            />
          )}

          {/* Select Student Display Field Filter Dropdown Trigger */}
          <Button
            type="button"
            variant={displayFieldsOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayFieldsOpen((prev) => !prev)}
            className={cn(
              'h-9 px-3 text-xs font-semibold gap-1.5 shadow-xs transition-all',
              displayFieldsOpen
                ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600'
                : 'border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Select Student Display Field</span>
            <Badge
              variant="secondary"
              className={cn(
                'ml-0.5 px-1.5 py-0 text-[10px] font-bold rounded-full',
                displayFieldsOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
              )}
            >
              {selectedDisplayFields.length}/{STUDENT_DISPLAY_FIELDS.length}
            </Badge>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', displayFieldsOpen && 'rotate-180')} />
          </Button>

          {/* Clear Filters Button */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Select Student Display Field Collapsible Dropdown Panel */}
      {displayFieldsOpen && (
        <div className="rounded-xl overflow-hidden border border-sky-300 dark:border-sky-800 shadow-sm mb-4">
          <div className="bg-[#00a6fb] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Eye className="w-4 h-4" />
              <span>Select Student Display Field</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateStudentReport}
                className="h-7 px-3 text-xs font-semibold bg-white text-sky-700 hover:bg-sky-50 shadow-xs gap-1.5"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Generate Report
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExportStudentReportCsv}
                className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV Report
              </Button>
            </div>
          </div>

          <div className="bg-[#dfeccb] dark:bg-slate-900/90 p-4 space-y-4 text-slate-800 dark:text-slate-200">
            {/* Check All & Check Default */}
            <div className="flex flex-wrap items-center gap-6 pb-2 border-b border-slate-400/30">
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllDisplayFieldsChecked}
                  onChange={(e) => handleCheckAllDisplayFields(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-400 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                />
                <span>Check All</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefaultDisplayFieldsChecked}
                  onChange={(e) => handleCheckDefaultDisplayFields(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-400 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                />
                <span>Check Default</span>
              </label>

              <span className="text-[11px] text-slate-600 dark:text-slate-400 ml-auto">
                {selectedDisplayFields.length} of {STUDENT_DISPLAY_FIELDS.length} fields selected
              </span>
            </div>

            {/* 6-Column Grid of 34 Display Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2.5">
              {STUDENT_DISPLAY_FIELDS.map((field) => {
                const checked = selectedDisplayFields.includes(field.key);
                return (
                  <label
                    key={field.key}
                    className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDisplayField(field.key)}
                      className="w-3.5 h-3.5 rounded border-slate-400 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600 shrink-0"
                    />
                    <span className="truncate" title={field.label}>
                      {field.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Input 
          placeholder="Search by name, email, or admission no..." 
          value={filters.search}
          onChange={(e) => setField('search', e.target.value)}
          className="max-w-md h-9 text-xs"
        />

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setReportViewMode('directory')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                reportViewMode === 'directory'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Directory
            </button>
            <button
              type="button"
              onClick={() => setReportViewMode('report')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                reportViewMode === 'report'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Report Table ({orderedSelectedFields.length} Cols)
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportStudentReportCsv}
            className="h-8 px-3 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="py-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>{reportViewMode === 'report' ? 'Generated Student Report' : 'Student Directory'}</span>
              <Badge variant="outline" className="text-xs font-mono font-semibold bg-background">
                {students.length} {students.length === 1 ? 'student' : 'students'}
              </Badge>
              {reportViewMode === 'report' && (
                <Badge variant="secondary" className="text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  {orderedSelectedFields.length} Columns
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No students found</div>
          ) : reportViewMode === 'report' ? (
            orderedSelectedFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No display fields selected. Click <strong>Select Student Display Field</strong> above to choose columns.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider">
                      {orderedSelectedFields.map((field) => (
                        <th key={field.key} className="px-3 py-2.5 whitespace-nowrap border-r last:border-r-0">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.filter(s => s && s.id).map((student, index) => (
                      <tr
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="hover:bg-muted/50 cursor-pointer transition-colors odd:bg-background even:bg-muted/10"
                      >
                        {orderedSelectedFields.map((field) => (
                          <td
                            key={field.key}
                            className="px-3 py-2 whitespace-nowrap border-r last:border-r-0 text-slate-700 dark:text-slate-300"
                          >
                            {getStudentDisplayFieldValue(student, index, field.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-2.5">
              {students.filter(s => s && (s.id || s.id)).map((student, index) => {
                const studentId = student.id || student.id;
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : '';
                const programName = typeof student.programId === 'object' ? student.programId?.name : '';
                const photoUrl = getStudentPhotoUrl(student);
                const uniName = student.program?.university?.name || student.enrollments?.[0]?.program?.university?.name;
                const uniCode = student.program?.university?.code || student.enrollments?.[0]?.program?.university?.code;
                const sessionName = student.enrollments?.[0]?.session?.name;

                return (
                  <div key={studentId} className="flex items-center justify-between p-3.5 border rounded-xl hover:bg-muted/40 transition-all hover:border-primary/40 group bg-card">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                      {/* Serial Number */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                        {index + 1}
                      </div>

                      {/* Student Photo */}
                      <div className="relative w-12 h-12 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
                        {photoUrl ? (
                          <img 
                            src={photoUrl} 
                            alt={student.name || 'Student Photo'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).parentElement?.querySelector('.photo-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={cn(
                          "w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm photo-fallback",
                          photoUrl ? "hidden" : ""
                        )}>
                          {student.name ? (
                            student.name.charAt(0).toUpperCase()
                          ) : (
                            <GraduationCap className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                          <span className="truncate">{student.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {student.uniEnrollmentNumber ? (
                            <span className="font-semibold text-primary">Uni ENR: {student.uniEnrollmentNumber}</span>
                          ) : (
                            <span>Admission No: <strong className="text-slate-700 dark:text-slate-300 font-medium">{student.enrollmentNo}</strong></span>
                          )}
                          {programName ? ` • ${programName}` : ''}{centerName ? ` • ${centerName}` : ''}
                        </div>
                        {(uniName || sessionName) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {uniName && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                🏛️ {uniCode || uniName}
                              </span>
                            )}
                            {sessionName && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                📅 {sessionName}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {student.email}</span>
                          {student.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" /> {student.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge className={cn(
                        "capitalize text-xs font-semibold",
                        student.status === 'active' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                        student.status === 'pending' ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-500/25" :
                        student.status === 'hold' ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700/60 hover:bg-indigo-500/25" :
                        student.status === 'dropout' ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700/60 hover:bg-rose-500/25" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {student.status || 'N/A'}
                      </Badge>

                      {canWrite && student.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.put(`/students/${studentId}`, { status: 'active' });
                              toast.success(`Student ${student.name} activated successfully`);
                              fetchStudents();
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Failed to activate student');
                            }
                          }}
                          className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 px-2.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Activate
                        </Button>
                      )}

                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(student); }} className="h-8 w-8 p-0"><Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(studentId); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={o => !o && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between w-full pr-6">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const photo = getStudentPhotoUrl(selectedStudent);
                      return photo ? (
                        <div className="w-11 h-11 rounded-full border-2 border-primary/30 overflow-hidden shrink-0 shadow-sm bg-slate-100">
                          <img src={photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <DialogTitle className="text-lg font-bold">{selectedStudent.name || 'Student Details'}</DialogTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">Admission: {selectedStudent.enrollmentNo}</span>
                        <Badge className="bg-primary/10 text-primary text-[10px] uppercase font-bold">
                          {selectedStudent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canWrite && selectedStudent.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={async () => {
                          try {
                            await api.put(`/students/${selectedStudent.id || selectedStudent.id}`, { status: 'active' });
                            toast.success(`Student ${selectedStudent.name} activated successfully`);
                            setSelectedStudent({ ...selectedStudent, status: 'active' });
                            fetchStudents();
                          } catch (err: any) {
                            toast.error(err.response?.data?.message || 'Failed to activate student');
                          }
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Activate Student
                      </Button>
                    )}
                    {['ops_admin', 'ops_sub_admin', 'employee', 'org_admin', 'superadmin'].includes(user?.role || '') && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const uniEnr = prompt('Enter University Enrollment Number:', selectedStudent.uniEnrollmentNumber || '');
                        if (uniEnr !== null) {
                          api.put(`/students/${selectedStudent.id || selectedStudent.id}`, { uniEnrollmentNumber: uniEnr })
                            .then(() => {
                              toast.success('University Enrollment Number saved');
                              fetchStudents();
                              setSelectedStudent({ ...selectedStudent, uniEnrollmentNumber: uniEnr });
                            })
                            .catch(() => toast.error('Failed to update University Enrollment Number'));
                        }
                      }}>
                        Add Uni Enrollment No
                      </Button>
                    )}
                    {user?.role === 'center_admin' && !['hold', 'dropout'].includes(selectedStudent.status) && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setRequestStatusOpen(true)}
                      >
                        Request Hold / Dropout
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="relative pt-2">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-4 h-4 flex items-center justify-center text-primary text-xs">👤</span> Personal & Contact Details
                  </h4>

                  {(() => {
                    const photo = getStudentPhotoUrl(selectedStudent);
                    if (!photo) return null;
                    return (
                      <div className="absolute top-0 right-0 w-24 h-28 border-2 border-primary/20 rounded-lg overflow-hidden shadow-md hidden sm:block bg-slate-100">
                        <img 
                          src={photo} 
                          alt="Student Photo" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border text-sm sm:pr-28">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Email</p>
                        <p className="font-medium">{selectedStudent.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Phone</p>
                        <p className="font-medium">{selectedStudent.phone || 'N/A'}</p>
                      </div>
                    </div>
                    {selectedStudent.dob && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Date of Birth</p>
                          <p className="font-medium">{selectedStudent.dob}</p>
                        </div>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4" />
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Gender</p>
                          <p className="font-medium">{selectedStudent.gender}</p>
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 flex items-start gap-2 pt-2 border-t">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Address</p>
                        <p className="font-medium">{selectedStudent.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Details */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" /> Program & Session Info
                  </h4>
                  <div className="bg-muted/10 p-4 rounded-xl border text-sm space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block">University</span>
                      <span className="font-semibold text-primary">
                        {selectedStudent.program?.university?.name ? `${selectedStudent.program.university.name} (${selectedStudent.program.university.code || ''})` : (selectedStudent.enrollments?.[0]?.program?.university?.name || 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Admission Session</span>
                      <span className="font-semibold text-foreground">
                        {selectedStudent.enrollments?.[0]?.session?.name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Program</span>
                      <span className="font-semibold">{selectedStudent.program?.name || 'N/A'} ({selectedStudent.program?.code || ''})</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Study Center</span>
                      <span className="font-semibold">{selectedStudent.center?.name || 'N/A'} ({selectedStudent.center?.code || ''})</span>
                    </div>
                    {selectedStudent.specialisation && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Specialisation Combo</span>
                        <span className="font-semibold text-indigo-600">{selectedStudent.specialisation}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Joined on: {new Date(selectedStudent.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Future Payments & Installments */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-primary" /> Fees & Installments
                  </h4>
                  {fetchingInstallments ? (
                    <div className="text-xs text-muted-foreground animate-pulse py-2">Loading installment schedules...</div>
                  ) : installments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg border">No installment structure found.</p>
                  ) : (
                    <div className="space-y-2">
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-muted/5 p-3 rounded-lg border text-sm hover:bg-muted/10 transition-colors">
                          <div>
                            <span className="font-semibold text-foreground">{inst.name}</span>
                            <span className="text-xs text-muted-foreground block">
                              Due Date: {new Date(inst.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">₹{inst.amount.toLocaleString()}</span>
                            {inst.status === 'paid' ? (
                              <Badge className="bg-success/15 text-success hover:bg-success/20 border-success/30 font-semibold text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Paid
                              </Badge>
                            ) : (
                              <div className="flex gap-2">
                                <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-warning/30 font-semibold text-xs flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Pending
                                </Badge>
                                {user?.role === 'center_admin' && (!selectedStudent?.programId?.university?.category || selectedStudent?.programId?.university?.category === 'direct_iits') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs font-semibold text-primary hover:bg-primary/10 border-primary/30"
                                    onClick={() => handlePayInstallmentClick(inst.name, inst.amount)}
                                    disabled={payingInstallment}
                                  >
                                    Pay Advance
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Original Enrollment Info */}
                {selectedStudent.enrollments && selectedStudent.enrollments.length > 0 && (
                  <>
                    {/* Educational Details */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-primary" /> Educational History
                      </h4>
                      {selectedStudent.enrollments[0].educationalDetails && selectedStudent.enrollments[0].educationalDetails.length > 0 ? (
                        <div className="space-y-2">
                          {selectedStudent.enrollments[0].educationalDetails.map((edu: any, idx: number) => (
                            <div key={idx} className="bg-muted/10 p-3 rounded-lg border text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <div className="col-span-1">
                                <span className="text-xs text-muted-foreground block">Qualification</span>
                                <span className="font-semibold">{edu.qualification}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-xs text-muted-foreground block">Board / University & Subject</span>
                                <span className="font-medium">{edu.boardUniversity || edu.institution} {edu.subject ? `(${edu.subject})` : ''}</span>
                              </div>
                              <div className="col-span-1 text-right">
                                <span className="text-xs text-muted-foreground block">Passing / %</span>
                                <span className="font-medium">{edu.year || edu.passingYear} {edu.percentage ? `· ${edu.percentage}%` : ''}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg border">No educational credentials added.</p>
                      )}
                    </div>

                    {/* Uploaded Documents */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" /> Uploaded Documents
                      </h4>
                      {selectedStudent.enrollments[0].documents && selectedStudent.enrollments[0].documents.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {selectedStudent.enrollments[0].documents.map((doc: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-2 bg-muted/10 p-3 rounded-lg border text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium">{doc.name}</span>
                                  {doc.status === 'approved' && <Badge className="bg-success/10 text-success text-[10px] uppercase">Approved</Badge>}
                                  {doc.status === 'rejected' && <Badge className="bg-destructive/10 text-destructive text-[10px] uppercase">Rejected</Badge>}
                                </div>
                                <a
                                  href={doc.url.startsWith('/') ? doc.url : `/uploads/${doc.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline font-semibold flex-shrink-0"
                                >
                                  View
                                </a>
                              </div>
                              {doc.remarks && <p className="text-xs text-destructive ml-6">Remark: {doc.remarks}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg border">No documents uploaded.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={requestStatusOpen} onOpenChange={setRequestStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Status Change</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestStatusChange} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Requested Status</Label>
              <Select 
                value={requestedStatus} 
                onValueChange={(val: 'hold' | 'dropout') => setRequestedStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="dropout">Dropout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason / Remarks</Label>
              <textarea
                className="w-full min-h-[100px] border rounded-md p-2 text-sm bg-background"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                placeholder="Please explain the reason for this request..."
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRequestStatusOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingStatusReq} className="bg-destructive hover:bg-destructive/90 text-white">
                {submittingStatusReq ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!payConfirmData} onOpenChange={(o) => !o && setPayConfirmData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              {payConfirmData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executePayInstallment} disabled={payingInstallment}>
              {payingInstallment ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
