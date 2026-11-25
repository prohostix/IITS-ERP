import { useState, useEffect, useCallback, useMemo } from 'react';
import { Edit, Trash2, Mail, Phone, GraduationCap, MapPin, Calendar, FileText, CreditCard, Check, Clock, CheckCircle, Eye, Download, ChevronDown, Table as TableIcon, LayoutList, ArrowRightLeft, XCircle, CheckCircle2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { ActiveFilterBar, type ActiveFilterItem } from '@/components/ui/ActiveFilterBar';
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
      if (student?.status === 'rejected' || student?.status === 'rejected_by_university') {
        if (student?.universityChangeRequest?.status === 'pending_center_approval') {
          return 'PENDING CENTER APPROVAL';
        }
        return 'REJECTED BY UNIVERSITY';
      }
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
  const isOps = ['ops_admin', 'ops_sub_admin', 'general_manager', 'project_manager', 'org_admin', 'superadmin'].includes(user?.role || '');
  const isCenter = user?.role === 'center_admin';
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
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
    rejected: 0,
  });

  // University Rejection state
  const [rejectUniStudent, setRejectUniStudent] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingStudent, setRejectingStudent] = useState(false);

  // University Change Request state (Operations)
  const [changeUniStudent, setChangeUniStudent] = useState<any | null>(null);
  const [changeUniData, setChangeUniData] = useState({
    universityId: '',
    programId: '',
    sessionId: '',
    specialisation: '',
    remarks: ''
  });
  const [submittingChangeUni, setSubmittingChangeUni] = useState(false);

  // Center Approval state (Study Center)
  const [centerApprovalStudent, setCenterApprovalStudent] = useState<any | null>(null);
  const [centerApprovalAction, setCenterApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [centerRemarks, setCenterRemarks] = useState('');
  const [processingCenterApproval, setProcessingCenterApproval] = useState(false);

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
  const currentViewMode = isCenter ? 'directory' : reportViewMode;

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
    branches: [] as string[],
    sessions: [] as string[],
    universities: [] as string[],
    programs: [] as string[],
    centers: [] as string[],
    sortBy: 'latest',
    search: '',
  });

  // Filter programs based on selected universities: only show programs from selected universities
  const filteredPrograms = useMemo(() => {
    if (!filters.universities || filters.universities.length === 0) return programs;
    const uniIds = filters.universities.map(String);
    return programs.filter(p => p && p.id && uniIds.includes(String(p.universityId || p.university?.id)));
  }, [programs, filters.universities]);

  // Prune any selected programs that do not belong to the selected universities
  useEffect(() => {
    if (filters.universities && filters.universities.length > 0 && filters.programs && filters.programs.length > 0) {
      const allowedIds = new Set(filteredPrograms.map(p => String(p.id)));
      const valid = filters.programs.filter((id: string) => allowedIds.has(String(id)));
      if (valid.length !== filters.programs.length) {
        setField('programs', valid);
      }
    }
  }, [filters.universities, filteredPrograms]);

  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    (filters.branches || []).forEach((bid: string) => {
      const match = branches.find(b => String(b.id) === String(bid));
      items.push({
        category: 'Branch',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || bid),
        onRemove: () => setField('branches', (filters.branches || []).filter((id: string) => id !== bid))
      });
    });
    (filters.sessions || []).forEach((sid: string) => {
      const match = sessions.find(s => String(s.id) === String(sid));
      items.push({
        category: 'Session',
        label: match?.name || sid,
        onRemove: () => setField('sessions', (filters.sessions || []).filter((id: string) => id !== sid))
      });
    });
    (filters.universities || []).forEach((uid: string) => {
      const match = universities.find(u => String(u.id) === String(uid));
      items.push({
        category: 'University',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || uid),
        onRemove: () => setField('universities', (filters.universities || []).filter((id: string) => id !== uid))
      });
    });
    (filters.programs || []).forEach((pid: string) => {
      const match = programs.find(p => String(p.id) === String(pid));
      items.push({
        category: 'Program',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || pid),
        onRemove: () => setField('programs', (filters.programs || []).filter((id: string) => id !== pid))
      });
    });
    (filters.centers || []).forEach((cid: string) => {
      const match = centers.find(c => String(c.id) === String(cid));
      items.push({
        category: 'Center',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || cid),
        onRemove: () => setField('centers', (filters.centers || []).filter((id: string) => id !== cid))
      });
    });
    return items;
  }, [filters, branches, sessions, universities, programs, centers]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.status && filters.status !== 'all') query.append('status', filters.status);
      if (filters.branches && filters.branches.length > 0) query.append('branchId', filters.branches.join(','));
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
          rejected: list.filter((s: any) => s.status === 'rejected' || s.status === 'rejected_by_university').length,
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

  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get('/org/branches');
      setBranches(response.data.data || []);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchCenters();
    fetchUniversities();
    fetchSessions();
    fetchBranches();
  }, [fetchStudents, fetchPrograms, fetchCenters, fetchUniversities, fetchSessions, fetchBranches]);

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
    
    const uniCategory = selectedStudent.program?.university?.category || selectedStudent.programId?.university?.category;
    const isNoWallet = uniCategory === 'team_lease';
    
    const message = isNoWallet 
      ? `Are you sure you want to mark ₹${amount.toLocaleString()} for ${installmentName} as paid directly to the university?`
      : `Are you sure you want to pay ₹${amount.toLocaleString()} for ${installmentName} in advance using your study center wallet?`;
      
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

  const handleRejectByUniversity = async () => {
    if (!rejectUniStudent || !rejectionReason.trim()) {
      toast.error('Please enter a rejection reason / university remarks');
      return;
    }
    setRejectingStudent(true);
    try {
      await api.put(`/students/${rejectUniStudent.id}/reject-by-university`, {
        reason: rejectionReason.trim()
      });
      toast.success(`Student ${rejectUniStudent.name} marked as rejected by university`);
      setRejectUniStudent(null);
      setRejectionReason('');
      if (selectedStudent?.id === rejectUniStudent.id) {
        setSelectedStudent(null);
      }
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject student');
    } finally {
      setRejectingStudent(false);
    }
  };

  const openChangeUniversityModal = (student: any) => {
    setChangeUniStudent(student);
    setChangeUniData({
      universityId: '',
      programId: '',
      sessionId: student.sessionId || '',
      specialisation: student.specialisation || '',
      remarks: ''
    });
  };

  const handleSubmitUniversityChange = async () => {
    if (!changeUniStudent || !changeUniData.programId) {
      toast.error('Please select the new program');
      return;
    }
    setSubmittingChangeUni(true);
    try {
      await api.post(`/students/${changeUniStudent.id}/request-university-change`, {
        newUniversityId: changeUniData.universityId,
        newProgramId: changeUniData.programId,
        newSessionId: changeUniData.sessionId,
        specialisation: changeUniData.specialisation,
        remarks: changeUniData.remarks
      });
      toast.success('University change request submitted to study center for approval');
      setChangeUniStudent(null);
      if (selectedStudent?.id === changeUniStudent.id) {
        setSelectedStudent(null);
      }
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request university change');
    } finally {
      setSubmittingChangeUni(false);
    }
  };

  const handleCenterApproval = async () => {
    if (!centerApprovalStudent) return;
    if (centerApprovalAction === 'reject' && !centerRemarks.trim()) {
      toast.error('Please provide remarks/reason for declining the university change');
      return;
    }
    setProcessingCenterApproval(true);
    try {
      if (centerApprovalAction === 'approve') {
        await api.post(`/students/${centerApprovalStudent.id}/approve-university-change`, {
          centerRemarks: centerRemarks.trim()
        });
        toast.success('University change approved. Student is now active in the new university!');
      } else {
        await api.post(`/students/${centerApprovalStudent.id}/reject-university-change`, {
          centerRemarks: centerRemarks.trim()
        });
        toast.success('University change request declined');
      }
      setCenterApprovalStudent(null);
      setCenterRemarks('');
      if (selectedStudent?.id === centerApprovalStudent.id) {
        setSelectedStudent(null);
      }
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process university change approval');
    } finally {
      setProcessingCenterApproval(false);
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
            {statusCounts.rejected > 0 && (
              <>
                <span className="h-3 w-px bg-border" />
                <span className="text-red-700 dark:text-red-400 font-medium">
                  Rejected: <strong>{statusCounts.rejected}</strong>
                </span>
              </>
            )}
          </div>

          {canWrite && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
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

      {/* Study Center Pending University Change Approval Alert Banner */}
      {isCenter && students.some(s => s.universityChangeRequest?.status === 'pending_center_approval') && (
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-purple-950 dark:text-purple-100">
                University Change Requests Pending Your Approval ({students.filter(s => s.universityChangeRequest?.status === 'pending_center_approval').length})
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Operations has proposed transferring student(s) rejected by previous universities. Review and approve to complete re-admission into the new university.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setField('status', 'rejected')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shrink-0 shadow-xs"
          >
            View Pending Requests
          </Button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { key: '', label: 'All', count: statusCounts.total || students.length, dot: 'bg-primary' },
            { key: 'active', label: 'Active', count: statusCounts.active, dot: 'bg-emerald-500' },
            { key: 'pending', label: 'Pending', count: statusCounts.pending, dot: 'bg-amber-500' },
            { key: 'hold', label: 'Hold', count: statusCounts.hold, dot: 'bg-indigo-500' },
            { key: 'dropout', label: 'Dropout', count: statusCounts.dropout, dot: 'bg-rose-500' },
            { key: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0, dot: 'bg-red-600' }
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
          {/* Branches Multi-Select (only for org-wide users not assigned to a branch) */}
          {!user?.branchId && !(user as any)?.designationRef?.branchId && user?.role !== 'center_admin' && user?.role !== 'branch_manager' && branches.length > 0 && (
            <MultiSelectFilter
              title="Branches"
              placeholder="All Branches"
              options={branches.map(b => ({ label: b.name, value: b.id, code: b.code }))}
              selectedValues={filters.branches || []}
              onChange={(values) => setField('branches', values)}
            />
          )}

          {/* Sort By Selector */}
          {user?.role !== 'center_admin' && (
            <Select value={filters.sortBy || 'latest'} onValueChange={(v) => setField('sortBy', v)}>
              <SelectTrigger className="h-9 w-[165px] text-xs font-semibold">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Sort: Latest First</SelectItem>
                <SelectItem value="branch_asc">Sort: Branch (A → Z)</SelectItem>
                <SelectItem value="branch_desc">Sort: Branch (Z → A)</SelectItem>
                <SelectItem value="name_asc">Sort: Name (A → Z)</SelectItem>
              </SelectContent>
            </Select>
          )}

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
            options={filteredPrograms.map(prog => ({
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
          {!isCenter && (
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
          )}

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

        {/* Active Filter Chips */}
        {activeFilterItems.length > 0 && (
          <div className="w-full pt-1">
            <ActiveFilterBar filters={activeFilterItems} onClearAll={clearFilters} />
          </div>
        )}
      </div>

      {/* Select Student Display Field Collapsible Dropdown Panel */}
      {!isCenter && displayFieldsOpen && (
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
          {!isCenter && (
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setReportViewMode('directory')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                  currentViewMode === 'directory'
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
                  currentViewMode === 'report'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Report Table ({orderedSelectedFields.length} Cols)
              </button>
            </div>
          )}

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
              <span>{currentViewMode === 'report' ? 'Generated Student Report' : 'Student Directory'}</span>
              <Badge variant="outline" className="text-xs font-mono font-semibold bg-background">
                {students.length} {students.length === 1 ? 'student' : 'students'}
              </Badge>
              {currentViewMode === 'report' && (
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
          ) : currentViewMode === 'report' ? (
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
                    {[...students].filter(s => s && s.id).sort((a, b) => {
                      const sortMode = filters.sortBy || 'latest';
                      if (sortMode === 'branch_asc') {
                        const ba = a.branchName || (typeof a.centerId === 'object' ? a.centerId?.branchName : '') || 'ZZZ';
                        const bb = b.branchName || (typeof b.centerId === 'object' ? b.centerId?.branchName : '') || 'ZZZ';
                        return ba.localeCompare(bb);
                      }
                      if (sortMode === 'branch_desc') {
                        const ba = a.branchName || (typeof a.centerId === 'object' ? a.centerId?.branchName : '') || '';
                        const bb = b.branchName || (typeof b.centerId === 'object' ? b.centerId?.branchName : '') || '';
                        return bb.localeCompare(ba);
                      }
                      if (sortMode === 'name_asc') {
                        return (a.name || '').localeCompare(b.name || '');
                      }
                      return 0;
                    }).map((student, index) => (
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
              {[...students].filter(s => s && (s.id || s.id)).sort((a, b) => {
                const sortMode = filters.sortBy || 'latest';
                if (sortMode === 'branch_asc') {
                  const ba = a.branchName || (typeof a.centerId === 'object' ? a.centerId?.branchName : '') || 'ZZZ';
                  const bb = b.branchName || (typeof b.centerId === 'object' ? b.centerId?.branchName : '') || 'ZZZ';
                  return ba.localeCompare(bb);
                }
                if (sortMode === 'branch_desc') {
                  const ba = a.branchName || (typeof a.centerId === 'object' ? a.centerId?.branchName : '') || '';
                  const bb = b.branchName || (typeof b.centerId === 'object' ? b.centerId?.branchName : '') || '';
                  return bb.localeCompare(ba);
                }
                if (sortMode === 'name_asc') {
                  return (a.name || '').localeCompare(b.name || '');
                }
                return 0;
              }).map((student, index) => {
                const studentId = student.id || student.id;
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : '';
                const branchName = student.branchName || (typeof student.centerId === 'object' ? student.centerId?.branchName : '') || '';
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
                          {student?.name ? (
                            (student.name || '?').charAt(0).toUpperCase()
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
                        {(uniName || sessionName || branchName) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {branchName && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                🏢 {branchName}
                              </span>
                            )}
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
                        {(student.universityRejectionReason || student.universityRejection?.reason) && (
                          <div className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-1">
                            <XCircle className="w-3 h-3 shrink-0" />
                            <span>Rejected by Uni: {student.universityRejectionReason || student.universityRejection?.reason}</span>
                          </div>
                        )}
                        {student.universityChangeRequest?.status === 'pending_center_approval' && (
                          <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-md px-2 py-0.5 mt-1 inline-flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Proposed Transfer: <strong>{student.universityChangeRequest.newUniversityName}</strong> ({student.universityChangeRequest.newProgramName}) — Pending Center Approval</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                      <Badge className={cn(
                        "capitalize text-xs font-semibold",
                        student.status === 'active' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                        student.status === 'pending' ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-500/25" :
                        student.status === 'hold' ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700/60 hover:bg-indigo-500/25" :
                        student.status === 'dropout' ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700/60 hover:bg-rose-500/25" :
                        (student.status === 'rejected' || student.status === 'rejected_by_university') ? "bg-red-600 text-white font-semibold" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {student.universityChangeRequest?.status === 'pending_center_approval'
                          ? 'Uni Change Pending Center'
                          : (student.status === 'rejected' || student.status === 'rejected_by_university')
                            ? 'Rejected by University'
                            : (student.status || 'N/A')}
                      </Badge>

                      {/* Operations: Reject by University action */}
                      {isOps && student.status !== 'rejected' && student.status !== 'rejected_by_university' && student.status !== 'dropout' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectUniStudent(student);
                            setRejectionReason('');
                          }}
                          className="h-8 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2.5"
                          title="Mark student as rejected by university"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject (Uni)
                        </Button>
                      )}

                      {/* Operations: Change University action when rejected */}
                      {isOps && (student.status === 'rejected' || student.status === 'rejected_by_university') && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChangeUniversityModal(student);
                          }}
                          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 px-2.5 shadow-xs"
                          title="Change student's university and re-apply"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Change University
                        </Button>
                      )}

                      {/* Center Admin: Approve or Decline University Change */}
                      {isCenter && student.universityChangeRequest?.status === 'pending_center_approval' && (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCenterApprovalStudent(student);
                              setCenterApprovalAction('approve');
                              setCenterRemarks('');
                            }}
                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 shadow-xs"
                            title="Approve university change"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve Uni Change
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCenterApprovalStudent(student);
                              setCenterApprovalAction('reject');
                              setCenterRemarks('');
                            }}
                            className="h-8 text-xs font-semibold text-rose-600 border-rose-300 hover:bg-rose-50 gap-1 px-2"
                            title="Decline university change"
                          >
                            Decline
                          </Button>
                        </>
                      )}

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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl border-border/80 shadow-2xl">
          {selectedStudent && (() => {
            const photo = getStudentPhotoUrl(selectedStudent);
            const enrollment = selectedStudent.enrollments?.[0] || {};
            const programObj = selectedStudent.program || enrollment.program || {};
            const uniObj = programObj.university || enrollment.session?.university || {};
            const sessionObj = enrollment.session || {};
            const centerObj = selectedStudent.center || {};
            const branchLabel = selectedStudent.branchName || centerObj.branchName || '';

            const totalFeeVal = getStudentDisplayFieldValue(selectedStudent, 0, 'total_fee');
            const discountVal = getStudentDisplayFieldValue(selectedStudent, 0, 'discount');
            const remittedVal = getStudentDisplayFieldValue(selectedStudent, 0, 'remitted_fee');
            const balanceVal = getStudentDisplayFieldValue(selectedStudent, 0, 'balance_fee');
            const admissionModeVal = getStudentDisplayFieldValue(selectedStudent, 0, 'admission_mode');
            const courseTypeVal = getStudentDisplayFieldValue(selectedStudent, 0, 'course_type');
            const durationVal = getStudentDisplayFieldValue(selectedStudent, 0, 'class_duration');
            const joinDateVal = getStudentDisplayFieldValue(selectedStudent, 0, 'date_of_join');
            const validUptoVal = getStudentDisplayFieldValue(selectedStudent, 0, 'valid_upto');

            const fatherName = selectedStudent.fatherName || enrollment.fatherName;
            const motherName = selectedStudent.motherName || enrollment.motherName;
            const parentMobile = selectedStudent.parentMobile || enrollment.parentMobile;
            const altPhone = selectedStudent.alternativePhone || enrollment.alternativePhone;
            const religion = selectedStudent.religion || enrollment.religion;
            const caste = selectedStudent.caste || enrollment.caste;
            const abcId = selectedStudent.abcId || enrollment.abcId;
            const debId = selectedStudent.debId || enrollment.debId;
            const fullAddress = [
              selectedStudent.address || enrollment.studentAddress || enrollment.address,
              selectedStudent.city || enrollment.city,
              selectedStudent.state || enrollment.state,
              selectedStudent.pincode || enrollment.pincode,
            ].filter(Boolean).join(', ') || 'N/A';

            return (
              <>
                {/* Top Hero Profile Banner */}
                <div className="relative bg-gradient-to-br from-primary/10 via-indigo-500/5 to-background border-b border-border/70 px-6 pt-6 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 pr-6">
                    {/* Avatar / Photo */}
                    <div className="relative w-20 h-20 rounded-2xl border-2 border-primary/25 overflow-hidden shrink-0 shadow-md bg-muted flex items-center justify-center">
                      {photo ? (
                        <img
                          src={photo}
                          alt={selectedStudent.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-2xl">
                          {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : <GraduationCap className="w-8 h-8 text-primary" />}
                        </div>
                      )}
                    </div>

                    {/* Title, Badges & Quick Identifiers */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <DialogTitle className="text-xl font-black tracking-tight text-foreground truncate">
                          {selectedStudent.name || 'Student Details'}
                        </DialogTitle>
                        <Badge className={cn(
                          'text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full',
                          selectedStudent.status === 'active' ? 'bg-emerald-600 text-white' :
                          selectedStudent.status === 'pending' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40' :
                          selectedStudent.status === 'hold' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40' :
                          selectedStudent.status === 'dropout' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/40' :
                          (selectedStudent.status === 'rejected' || selectedStudent.status === 'rejected_by_university') ? 'bg-red-600 text-white' :
                          'bg-primary/10 text-primary'
                        )}>
                          {selectedStudent.status?.replace(/_/g, ' ')}
                        </Badge>
                        {branchLabel && (
                          <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25">
                            🏢 {branchLabel}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/90 border border-border/80 font-mono text-muted-foreground shadow-2xs">
                          <span className="font-sans font-semibold text-foreground/70">Admission No:</span>
                          <strong className="text-foreground font-bold">{selectedStudent.enrollmentNo || '-'}</strong>
                        </span>
                        {selectedStudent.uniEnrollmentNumber ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 font-mono text-primary shadow-2xs">
                            <span className="font-sans font-semibold">Uni Enrollment No:</span>
                            <strong className="font-bold">{selectedStudent.uniEnrollmentNumber}</strong>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                            Uni Enrollment No: Not Assigned
                          </span>
                        )}
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        {/* Add / Edit Uni Enrollment No */}
                        {['ops_admin', 'ops_sub_admin', 'general_manager', 'project_manager', 'employee', 'org_admin', 'superadmin', 'branch_manager'].includes(user?.role || '') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold bg-background hover:bg-primary/5 border-primary/30 text-primary gap-1.5 shadow-2xs"
                            onClick={() => {
                              const uniEnr = prompt('Enter University Enrollment Number:', selectedStudent.uniEnrollmentNumber || '');
                              if (uniEnr !== null) {
                                api.put(`/students/${selectedStudent.id}`, { uniEnrollmentNumber: uniEnr })
                                  .then(() => {
                                    toast.success('University Enrollment Number saved');
                                    fetchStudents();
                                    setSelectedStudent({ ...selectedStudent, uniEnrollmentNumber: uniEnr });
                                  })
                                  .catch(() => toast.error('Failed to update University Enrollment Number'));
                              }
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {selectedStudent.uniEnrollmentNumber ? 'Edit Uni Enrollment No' : 'Add Uni Enrollment No'}
                          </Button>
                        )}

                        {/* Operations: Activate Pending Student */}
                        {canWrite && selectedStudent.status === 'pending' && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-2xs"
                            onClick={async () => {
                              try {
                                await api.put(`/students/${selectedStudent.id}`, { status: 'active' });
                                toast.success(`Student ${selectedStudent.name} activated successfully`);
                                setSelectedStudent({ ...selectedStudent, status: 'active' });
                                fetchStudents();
                              } catch (err: any) {
                                toast.error(err.response?.data?.message || 'Failed to activate student');
                              }
                            }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Activate Student
                          </Button>
                        )}

                        {/* Operations: Reject by University */}
                        {isOps && selectedStudent.status !== 'rejected' && selectedStudent.status !== 'rejected_by_university' && selectedStudent.status !== 'dropout' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold gap-1.5 bg-background shadow-2xs"
                            onClick={() => {
                              setRejectUniStudent(selectedStudent);
                              setRejectionReason('');
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject (Uni)
                          </Button>
                        )}

                        {/* Operations: Change University */}
                        {isOps && (selectedStudent.status === 'rejected' || selectedStudent.status === 'rejected_by_university') && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-2xs"
                            onClick={() => openChangeUniversityModal(selectedStudent)}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Change University
                          </Button>
                        )}

                        {/* Study Center Admin: Approve or Decline */}
                        {isCenter && selectedStudent.universityChangeRequest?.status === 'pending_center_approval' && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                              onClick={() => {
                                setCenterApprovalStudent(selectedStudent);
                                setCenterApprovalAction('approve');
                                setCenterRemarks('');
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Change
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 font-semibold gap-1.5"
                              onClick={() => {
                                setCenterApprovalStudent(selectedStudent);
                                setCenterApprovalAction('reject');
                                setCenterRemarks('');
                              }}
                            >
                              Decline
                            </Button>
                          </>
                        )}

                        {user?.role === 'center_admin' && !['hold', 'dropout'].includes(selectedStudent.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs font-semibold"
                            onClick={() => setRequestStatusOpen(true)}
                          >
                            Request Hold / Dropout
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6">
                  {/* Alert Banners if Rejected or Pending Uni Change */}
                  {(selectedStudent.status === 'rejected' || selectedStudent.status === 'rejected_by_university') && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Student Rejected by University</span>
                      </div>
                      <p className="text-xs text-rose-800 dark:text-rose-200">
                        <strong>Rejection Reason:</strong> {selectedStudent.universityRejectionReason || selectedStudent.universityRejection?.reason || 'No remarks provided.'}
                      </p>
                      {selectedStudent.universityRejection?.rejectedByName && (
                        <p className="text-[11px] text-muted-foreground">
                          Processed by {selectedStudent.universityRejection.rejectedByName} on {formatDateVal(selectedStudent.universityRejection.rejectedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedStudent.universityChangeRequest && (
                    <div className={cn(
                      'border rounded-xl p-4 space-y-2',
                      selectedStudent.universityChangeRequest.status === 'pending_center_approval' ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' :
                      selectedStudent.universityChangeRequest.status === 'approved' ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' :
                      'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    )}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span>University Change &amp; Re-Admission Request</span>
                        </div>
                        <Badge className={cn(
                          'text-xs uppercase font-semibold',
                          selectedStudent.universityChangeRequest.status === 'pending_center_approval' ? 'bg-purple-600 text-white' :
                          selectedStudent.universityChangeRequest.status === 'approved' ? 'bg-emerald-600 text-white' :
                          'bg-rose-600 text-white'
                        )}>
                          {selectedStudent.universityChangeRequest.status === 'pending_center_approval' ? 'Pending Center Approval' :
                           selectedStudent.universityChangeRequest.status === 'approved' ? 'Approved by Center' : 'Declined by Center'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground block">Proposed University:</span>
                          <span className="font-semibold text-foreground">{selectedStudent.universityChangeRequest.newUniversityName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Proposed Program:</span>
                          <span className="font-semibold text-foreground">{selectedStudent.universityChangeRequest.newProgramName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Proposed Session:</span>
                          <span className="font-semibold text-foreground">{selectedStudent.universityChangeRequest.newSessionName || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Operations Remarks:</span>
                          <span className="text-foreground">{selectedStudent.universityChangeRequest.remarks || 'None'}</span>
                        </div>
                      </div>
                      {selectedStudent.universityChangeRequest.centerRemarks && (
                        <div className="text-xs pt-2 border-t mt-2">
                          <span className="text-muted-foreground block">Study Center Remarks:</span>
                          <span className="font-medium text-foreground">{selectedStudent.universityChangeRequest.centerRemarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Financial Overview Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border bg-primary/5 border-primary/15">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Course Fee</span>
                      <span className="text-base font-black text-primary mt-0.5 block">{totalFeeVal}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Remitted Fee</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{remittedVal}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Balance Due</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{balanceVal}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/30">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Payment Mode</span>
                      <span className="text-sm font-bold text-foreground mt-1 block truncate" title={admissionModeVal}>
                        {admissionModeVal} {discountVal !== '₹0' ? `(Disc: ${discountVal})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Two-Column Core Cards: Personal Details & Academic Program Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Card: Personal & Contact Details */}
                    <div className="rounded-xl border bg-card shadow-2xs overflow-hidden flex flex-col">
                      <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">👤</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Personal &amp; Contact Details</h4>
                      </div>
                      <div className="p-4 space-y-3 text-xs flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <Mail className="w-3 h-3 text-primary/70 shrink-0" /> Email
                            </span>
                            <p className="font-semibold text-foreground mt-0.5 break-all">{selectedStudent.email || enrollment.studentEmail || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <Phone className="w-3 h-3 text-primary/70 shrink-0" /> Phone
                            </span>
                            <p className="font-semibold text-foreground mt-0.5">{selectedStudent.phone || enrollment.studentPhone || 'N/A'}</p>
                            {altPhone && <p className="text-[11px] text-muted-foreground">Alt: {altPhone}</p>}
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary/70 shrink-0" /> Date of Birth
                            </span>
                            <p className="font-semibold text-foreground mt-0.5">{formatDateVal(selectedStudent.dob || enrollment.dob)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium block">Gender</span>
                            <p className="font-semibold text-foreground mt-0.5 capitalize">{selectedStudent.gender || enrollment.gender || 'N/A'}</p>
                          </div>
                          {(fatherName || motherName) && (
                            <>
                              <div>
                                <span className="text-muted-foreground font-medium block">Father / Parent Name</span>
                                <p className="font-semibold text-foreground mt-0.5">{fatherName || '-'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium block">Mother Name</span>
                                <p className="font-semibold text-foreground mt-0.5">{motherName || '-'}</p>
                              </div>
                            </>
                          )}
                          {(parentMobile || religion || caste) && (
                            <>
                              {parentMobile && (
                                <div>
                                  <span className="text-muted-foreground font-medium block">Parent Mobile</span>
                                  <p className="font-semibold text-foreground mt-0.5">{parentMobile}</p>
                                </div>
                              )}
                              {(religion || caste) && (
                                <div>
                                  <span className="text-muted-foreground font-medium block">Religion / Caste</span>
                                  <p className="font-semibold text-foreground mt-0.5">{[religion, caste].filter(Boolean).join(' · ')}</p>
                                </div>
                              )}
                            </>
                          )}
                          {(abcId || debId) && (
                            <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
                              {abcId && (
                                <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px]">
                                  <strong>ABC ID:</strong> {abcId}
                                </span>
                              )}
                              {debId && (
                                <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px]">
                                  <strong>DEB ID:</strong> {debId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-border/60">
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary/70 shrink-0" /> Present Address
                          </span>
                          <p className="font-semibold text-foreground mt-0.5 leading-relaxed">{fullAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: Program & Session Info */}
                    <div className="rounded-xl border bg-card shadow-2xs overflow-hidden flex flex-col">
                      <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Program &amp; Session Info</h4>
                      </div>
                      <div className="p-4 space-y-3 text-xs flex-1">
                        <div>
                          <span className="text-muted-foreground font-medium block">University / Board</span>
                          <p className="font-bold text-primary text-sm mt-0.5">
                            {uniObj.name ? `${uniObj.name}${uniObj.code ? ` (${uniObj.code})` : ''}` : 'N/A'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-muted-foreground font-medium block">Degree Program</span>
                            <p className="font-semibold text-foreground mt-0.5">
                              {programObj.name || 'N/A'}{programObj.code ? ` (${programObj.code})` : ''}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium block">Admission Session</span>
                            <p className="font-semibold text-foreground mt-0.5">{sessionObj.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium block">Study Center</span>
                            <p className="font-semibold text-foreground mt-0.5">
                              {centerObj.name || 'N/A'}{centerObj.code ? ` (${centerObj.code})` : ''}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium block">Course Type &amp; Duration</span>
                            <p className="font-semibold text-foreground mt-0.5">
                              {courseTypeVal !== '-' ? `${courseTypeVal} · ` : ''}{durationVal}
                            </p>
                          </div>
                          {(selectedStudent.specialisation || enrollment.specialisation) && (
                            <div className="sm:col-span-2">
                              <span className="text-muted-foreground font-medium block">Specialization</span>
                              <p className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {selectedStudent.specialisation || enrollment.specialisation}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-border/60 flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary/70" /> Joined: <strong className="text-foreground">{joinDateVal}</strong>
                          </span>
                          {validUptoVal !== '-' && (
                            <span>Valid Upto: <strong className="text-foreground">{validUptoVal}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Future Payments & Installments */}
                  <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Fees &amp; Installment Schedule</h4>
                      </div>
                      {installments.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {installments.filter(i => i.status === 'paid').length}/{installments.length} Paid
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      {fetchingInstallments ? (
                        <div className="text-xs text-muted-foreground animate-pulse py-2">Loading installment schedules...</div>
                      ) : installments.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No installment schedule configured for this enrollment.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-muted/20 px-3.5 py-2.5 rounded-xl border text-xs hover:border-primary/30 transition-colors">
                              <div>
                                <span className="font-bold text-foreground block">{inst.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  Due: {formatDateVal(inst.dueDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-black text-sm text-foreground">₹{Number(inst.amount || 0).toLocaleString('en-IN')}</span>
                                {inst.status === 'paid' ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-[10px] flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Paid
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold text-[10px] flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Pending
                                    </Badge>
                                    {user?.role === 'center_admin' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 border-primary/30"
                                        onClick={() => handlePayInstallmentClick(inst.name, inst.amount)}
                                        disabled={payingInstallment}
                                      >
                                        Pay
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
                  </div>

                  {/* Educational History & Uploaded Documents */}
                  {selectedStudent.enrollments && selectedStudent.enrollments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Educational Details */}
                      <div className="rounded-xl border bg-card shadow-2xs overflow-hidden flex flex-col">
                        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Educational History</h4>
                        </div>
                        <div className="p-4 flex-1">
                          {enrollment.educationalDetails && enrollment.educationalDetails.length > 0 ? (
                            <div className="space-y-2.5">
                              {enrollment.educationalDetails.map((edu: any, idx: number) => (
                                <div key={idx} className="bg-muted/20 p-3 rounded-xl border text-xs flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="font-bold text-foreground block">{edu.qualification}</span>
                                    <span className="text-muted-foreground truncate block">
                                      {edu.boardUniversity || edu.institution || '-'} {edu.subject ? `(${edu.subject})` : ''}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                      {edu.year || edu.passingYear || '-'} {edu.percentage ? `· ${edu.percentage}%` : ''}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No educational credentials added.</p>
                          )}
                        </div>
                      </div>

                      {/* Uploaded Documents */}
                      <div className="rounded-xl border bg-card shadow-2xs overflow-hidden flex flex-col">
                        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Uploaded Documents</h4>
                          </div>
                          {Array.isArray(enrollment.documents) && enrollment.documents.length > 0 && (
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {enrollment.documents.length} {enrollment.documents.length === 1 ? 'File' : 'Files'}
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 flex-1">
                          {enrollment.documents && enrollment.documents.length > 0 ? (
                            <div className="space-y-2">
                              {enrollment.documents.map((doc: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1.5 bg-muted/20 px-3 py-2.5 rounded-xl border text-xs hover:border-primary/30 transition-colors">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="font-semibold text-foreground truncate">{doc.name || doc.reqName || `Document ${idx + 1}`}</span>
                                      {doc.status === 'approved' && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] uppercase shrink-0">Approved</Badge>}
                                      {doc.status === 'rejected' && <Badge className="bg-destructive/15 text-destructive text-[10px] uppercase shrink-0">Rejected</Badge>}
                                    </div>
                                    {doc.url && (
                                      <a
                                        href={doc.url.startsWith('/') || doc.url.startsWith('http') ? doc.url : `/uploads/${doc.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold text-[11px] shrink-0 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" /> View
                                      </a>
                                    )}
                                  </div>
                                  {doc.remarks && <p className="text-[11px] text-destructive pl-5">Remark: {doc.remarks}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No documents uploaded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="px-6 py-3.5 bg-muted/30 border-t">
                  <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
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
      
      {/* Reject Student by University Dialog (Operations) */}
      <Dialog open={!!rejectUniStudent} onOpenChange={(open) => !open && setRejectUniStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              Reject Student by University
            </DialogTitle>
          </DialogHeader>
          {rejectUniStudent && (
            <div className="space-y-4 pt-1">
              <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
                <p><strong>Student:</strong> {rejectUniStudent.name}</p>
                <p><strong>Admission No:</strong> {rejectUniStudent.enrollmentNo}</p>
                <p><strong>Current University:</strong> {rejectUniStudent.program?.university?.name || rejectUniStudent.enrollments?.[0]?.program?.university?.name || 'N/A'}</p>
                <p><strong>Program:</strong> {rejectUniStudent.program?.name || 'N/A'}</p>
                <p><strong>Study Center:</strong> {rejectUniStudent.center?.name || 'N/A'}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Rejection Reason / University Scrutiny Remarks <span className="text-destructive">*</span>
                </Label>
                <textarea
                  className="w-full min-h-[90px] border rounded-lg p-2.5 text-xs bg-background outline-none focus:border-rose-500"
                  placeholder="Enter specific university rejection reason (e.g., Ineligible as per university norms, documents rejected, quota full)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                Marking this student as rejected by university will update their status to "Rejected" and allow Operations to propose re-admission to an alternative university.
              </p>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectUniStudent(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={rejectingStudent || !rejectionReason.trim()}
                  onClick={handleRejectByUniversity}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {rejectingStudent ? 'Rejecting...' : 'Confirm University Rejection'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change University & Re-Admission Dialog (Operations) */}
      <Dialog open={!!changeUniStudent} onOpenChange={(open) => !open && setChangeUniStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <ArrowRightLeft className="w-5 h-5" />
              Change University & Re-Admission
            </DialogTitle>
          </DialogHeader>
          {changeUniStudent && (
            <div className="space-y-4 pt-1">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                <p><strong>Student:</strong> {changeUniStudent.name} ({changeUniStudent.enrollmentNo})</p>
                <p><strong>Previous / Rejected University:</strong> {changeUniStudent.program?.university?.name || 'N/A'} - {changeUniStudent.program?.name || 'N/A'}</p>
                {changeUniStudent.universityRejectionReason && (
                  <p className="text-destructive"><strong>Rejection Reason:</strong> {changeUniStudent.universityRejectionReason}</p>
                )}
                <p><strong>Study Center:</strong> {changeUniStudent.center?.name || 'N/A'}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">New University <span className="text-destructive">*</span></Label>
                  <Select
                    value={changeUniData.universityId}
                    onValueChange={(val) => setChangeUniData(prev => ({ ...prev, universityId: val, programId: '', sessionId: '' }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select target university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">New Degree Program <span className="text-destructive">*</span></Label>
                  <Select
                    value={changeUniData.programId}
                    onValueChange={(val) => setChangeUniData(prev => ({ ...prev, programId: val }))}
                    disabled={!changeUniData.universityId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={changeUniData.universityId ? "Select program" : "Select a university first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {programs
                        .filter(p => p.universityId === changeUniData.universityId || p.university?.id === changeUniData.universityId)
                        .map(prog => (
                          <SelectItem key={prog.id} value={prog.id.toString()}>
                            {prog.name} {prog.code ? `(${prog.code})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Admission Session</Label>
                  <Select
                    value={changeUniData.sessionId}
                    onValueChange={(val) => setChangeUniData(prev => ({ ...prev, sessionId: val }))}
                    disabled={!changeUniData.universityId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select session (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions
                        .filter(s => !changeUniData.universityId || s.universityId === changeUniData.universityId || s.university?.id === changeUniData.universityId)
                        .map(sess => (
                          <SelectItem key={sess.id} value={sess.id}>
                            {sess.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Specialisation Combo (Optional)</Label>
                  <Input
                    className="h-9 text-xs"
                    placeholder="e.g. Finance & Marketing, History & Politics"
                    value={changeUniData.specialisation}
                    onChange={(e) => setChangeUniData(prev => ({ ...prev, specialisation: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Operations Remarks / Transfer Justification</Label>
                  <textarea
                    className="w-full min-h-[70px] border rounded-lg p-2 text-xs bg-background outline-none"
                    placeholder="Explain why this university is chosen and any special instructions for the center..."
                    value={changeUniData.remarks}
                    onChange={(e) => setChangeUniData(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bg-purple-50/70 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200">
                ℹ️ <strong>Center Approval Required:</strong> Submitting this request will notify <strong>{changeUniStudent.center?.name || 'the study center'}</strong>. The student will be officially enrolled in the new university only after the study center reviews and approves.
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setChangeUniStudent(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={submittingChangeUni || !changeUniData.programId}
                  onClick={handleSubmitUniversityChange}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {submittingChangeUni ? 'Submitting...' : 'Send to Center for Approval'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Study Center Approval / Decline Dialog */}
      <Dialog open={!!centerApprovalStudent} onOpenChange={(open) => !open && setCenterApprovalStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={cn(
              "flex items-center gap-2",
              centerApprovalAction === 'approve' ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"
            )}>
              {centerApprovalAction === 'approve' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Approve University Change
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Decline University Change
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {centerApprovalStudent && (
            <div className="space-y-4 pt-1">
              <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1.5">
                <p><strong>Student:</strong> {centerApprovalStudent.name} ({centerApprovalStudent.enrollmentNo})</p>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Previous University:</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-400">
                      {centerApprovalStudent.program?.university?.name || 'Previous University'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Proposed New University:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {centerApprovalStudent.universityChangeRequest?.newUniversityName || 'New University'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Proposed Program & Session:</span>
                  <span className="font-medium">
                    {centerApprovalStudent.universityChangeRequest?.newProgramName} • {centerApprovalStudent.universityChangeRequest?.newSessionName || '-'}
                  </span>
                </div>
                {centerApprovalStudent.universityChangeRequest?.remarks && (
                  <div className="pt-1 border-t text-[11px]">
                    <span className="text-muted-foreground block">Operations Note:</span>
                    <span className="italic">{centerApprovalStudent.universityChangeRequest.remarks}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Study Center Remarks {centerApprovalAction === 'reject' && <span className="text-destructive">*</span>}
                </Label>
                <textarea
                  className="w-full min-h-[75px] border rounded-lg p-2.5 text-xs bg-background outline-none"
                  placeholder={centerApprovalAction === 'approve' 
                    ? "Add any optional comments or fee confirmation notes..." 
                    : "Please explain why this university change cannot be accepted..."}
                  value={centerRemarks}
                  onChange={(e) => setCenterRemarks(e.target.value)}
                  required={centerApprovalAction === 'reject'}
                />
              </div>

              {centerApprovalAction === 'approve' ? (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  ✓ Upon your approval, the student will be officially transferred and activated in <strong>{centerApprovalStudent.universityChangeRequest?.newUniversityName}</strong>.
                </p>
              ) : (
                <p className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                  ⚠️ Declining will notify Operations with your remarks so they can suggest an alternative option.
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCenterApprovalStudent(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={processingCenterApproval || (centerApprovalAction === 'reject' && !centerRemarks.trim())}
                  onClick={handleCenterApproval}
                  className={centerApprovalAction === 'approve' ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"}
                >
                  {processingCenterApproval 
                    ? 'Processing...' 
                    : centerApprovalAction === 'approve' ? 'Confirm & Enroll in New University' : 'Decline Request'}
                </Button>
              </DialogFooter>
            </div>
          )}
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
