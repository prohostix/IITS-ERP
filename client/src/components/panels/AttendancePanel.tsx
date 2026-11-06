import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, CalendarIcon, LayoutList, CalendarDays, Search, Clock, 
  CheckCircle2, XCircle, AlertTriangle, Download, User, Users, ChevronLeft, ChevronRight, X, ArrowLeft,
  Briefcase
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isSameMonth 
} from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export function AttendancePanel({ isPersonalView = false }: { isPersonalView?: boolean }) {
  const { user } = useAuth();
  const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'sales_admin', 'center_admin', 'ops_sub_admin'];
  const isBranchManager = Boolean((user as any)?.branchId);
  const isHR = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo', 'general_manager'].includes(user?.role || '') && !isPersonalView;
  const isDeptManager = (DEPT_MANAGER_ROLES.includes(user?.role || '') || isBranchManager || isHR) && !isPersonalView;
  const canViewAll = isDeptManager;
  
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Employee Selection & Monthly Attendance States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [employeeMonthlyAttendance, setEmployeeMonthlyAttendance] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Date Filtering & View Mode States
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusTab, setStatusTab] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Punch mode: both, checkInOnly, checkOutOnly, statusOnly
  const [punchMode, setPunchMode] = useState<'both' | 'checkInOnly' | 'checkOutOnly' | 'statusOnly'>('both');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '',
    checkOut: '',
    notes: ''
  });

  useEffect(() => {
    fetchAttendance();
    if (canViewAll) fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId !== 'all') {
      fetchEmployeeMonthlyAttendance();
    }
  }, [selectedEmployeeId, currentMonth]);

  const fetchEmployeeMonthlyAttendance = async () => {
    setMonthlyLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const res = await api.get(`/hr/attendance?employeeId=${selectedEmployeeId}&startDate=${monthStart}&endDate=${monthEnd}`);
      setEmployeeMonthlyAttendance(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load employee monthly attendance');
    } finally {
      setMonthlyLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const endpoint = canViewAll ? '/hr/attendance' : '/hr/attendance/my';
      const response = await api.get(endpoint);
      setAttendance(response.data.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users');
      const allUsers = response.data.data || [];
      setEmployees(allUsers.filter((u: any) => !['ceo', 'org_admin', 'superadmin', 'center_admin', 'student'].includes(u.role)));
    } catch (error) {
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    if (formData.date > todayStr) {
      toast.error('Attendance cannot be marked for a future date');
      return;
    }

    try {
      const toISO = (date: string, time: string) => {
        if (!date || !time) return undefined;
        return new Date(`${date}T${time}:00`).toISOString();
      };

      const payload: any = {
        userId: formData.employeeId,
        employeeId: formData.employeeId,
        date: formData.date,
        status: formData.status,
        notes: formData.notes,
      };

      // Handle punch mode
      if (punchMode === 'both' || punchMode === 'checkInOnly') {
        if (formData.checkIn) payload.checkIn = toISO(formData.date, formData.checkIn);
        else payload.checkIn = null;
      } else {
        payload.checkIn = null;
      }

      if (punchMode === 'both' || punchMode === 'checkOutOnly') {
        if (formData.checkOut) payload.checkOut = toISO(formData.date, formData.checkOut);
        else payload.checkOut = null;
      } else {
        payload.checkOut = null;
      }

      if (editingId && !editingId.startsWith('virtual-')) {
        await api.put(`/hr/attendance/${editingId}`, payload);
        toast.success('Attendance updated successfully');
      } else {
        await api.post('/hr/attendance', payload);
        toast.success('Attendance marked successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchAttendance();
      if (selectedEmployeeId !== 'all') {
        fetchEmployeeMonthlyAttendance();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleEdit = (record: any) => {
    const recId = record.id;
    const empId = record.employeeId?.id || record.userId || record.employeeId || '';
    setEditingId(recId);

    const hasIn = Boolean(record.checkIn);
    const hasOut = Boolean(record.checkOut);
    let mode: 'both' | 'checkInOnly' | 'checkOutOnly' | 'statusOnly' = 'both';
    if (hasIn && !hasOut) mode = 'checkInOnly';
    else if (!hasIn && hasOut) mode = 'checkOutOnly';
    else if (!hasIn && !hasOut) mode = 'statusOnly';
    setPunchMode(mode);

    setFormData({
      employeeId: empId?.toString() || '',
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : todayStr,
      status: record.status || 'present',
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const handleMarkDirect = (empId: string, defaultStatus = 'present') => {
    setEditingId(null);
    setPunchMode('both');
    setFormData({
      employeeId: empId,
      date: dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : todayStr,
      status: defaultStatus,
      checkIn: '09:00',
      checkOut: '',
      notes: ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('virtual-')) return;
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/hr/attendance/${id}`);
      toast.success('Attendance record deleted');
      fetchAttendance();
      if (selectedEmployeeId !== 'all') {
        fetchEmployeeMonthlyAttendance();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPunchMode('both');
    setFormData({
      employeeId: selectedEmployeeId !== 'all' ? selectedEmployeeId : '',
      date: todayStr,
      status: 'present',
      checkIn: '',
      checkOut: '',
      notes: ''
    });
  };

  const handleExportCSV = () => {
    if (selectedEmployeeId !== 'all') {
      const currentEmp = employees.find(e => String(e.id) === String(selectedEmployeeId));
      if (!employeeMonthlyAttendance || employeeMonthlyAttendance.length === 0) {
        toast.error('No monthly attendance records to export for this employee');
        return;
      }
      const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Late Minutes', 'Working Hours', 'WFH', 'Notes'];
      const rows = employeeMonthlyAttendance.map(r => [
        `"${r.date ? format(new Date(r.date), 'yyyy-MM-dd') : ''}"`,
        `"${r.status || 'present'}"`,
        `"${r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : ''}"`,
        `"${r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : ''}"`,
        r.lateMinutes || 0,
        r.workingHours || 0,
        r.isWFH ? 'Yes' : 'No',
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const monthStr = format(currentMonth, 'yyyy-MM');
      link.setAttribute('download', `monthly_attendance_${(currentEmp?.name || 'employee').replace(/\s+/g, '_')}_${monthStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Monthly attendance report downloaded');
      return;
    }

    if (!combinedRecords || combinedRecords.length === 0) {
      toast.error('No attendance records to export');
      return;
    }
    const headers = ['Employee Name', 'Email', 'Designation', 'Date', 'Status', 'Check In', 'Check Out', 'Late Minutes', 'Working Hours', 'WFH', 'Notes'];
    const rows = combinedRecords.map(r => [
      `"${r.employeeName || ''}"`,
      `"${r.employeeEmail || ''}"`,
      `"${r.employeeDesignation || ''}"`,
      `"${r.date ? format(new Date(r.date), 'yyyy-MM-dd') : (dateFilter ? format(dateFilter, 'yyyy-MM-dd') : '')}"`,
      `"${r.status || (r.isRecorded ? 'present' : 'absent')}"`,
      `"${r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : ''}"`,
      `"${r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : ''}"`,
      r.lateMinutes || 0,
      r.workingHours || 0,
      r.isWFH ? 'Yes' : 'No',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = dateFilter ? format(dateFilter, 'yyyy-MM-dd') : 'all';
    link.setAttribute('download', `attendance_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance report downloaded');
  };

  const getStatusBadge = (status: string, isRecorded: boolean) => {
    if (!isRecorded && status === 'absent') {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">Not Checked In (Absent)</Badge>;
    }
    const variants: any = {
      present: 'bg-green-100 text-green-800 border-green-200',
      absent: 'bg-red-100 text-red-800 border-red-200',
      late: 'bg-amber-100 text-amber-800 border-amber-200',
      half_day: 'bg-blue-100 text-blue-800 border-blue-200',
      leave: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return <Badge className={variants[status] || ''}>{status?.replace('_', ' ')}</Badge>;
  };

  // Compile combined records for the selected date
  const combinedRecords = (() => {
    if (!canViewAll) {
      // Personal view: only show own recorded attendance
      return attendance.filter(rec => {
        if (!rec || !rec.date) return false;
        if (!dateFilter) return true;
        const recDate = new Date(rec.date);
        return recDate.getDate() === dateFilter.getDate() && 
               recDate.getMonth() === dateFilter.getMonth() && 
               recDate.getFullYear() === dateFilter.getFullYear();
      }).map(rec => ({
        ...rec,
        employeeName: rec.user?.name || user?.name,
        employeeEmail: rec.user?.email || user?.email,
        employeeDesignation: rec.user?.designation,
        isRecorded: true,
      }));
    }

    // HR / Manager View: match all active employees against attendance for selected date
    return employees.map(emp => {
      const empId = emp.id;
      const existingRec = attendance.find(rec => {
        const recEmpId = rec.employeeId?.id || rec.userId || rec.employeeId;
        if (String(recEmpId) !== String(empId)) return false;
        if (!dateFilter) return true;
        const recDate = new Date(rec.date);
        return recDate.getDate() === dateFilter.getDate() && 
               recDate.getMonth() === dateFilter.getMonth() && 
               recDate.getFullYear() === dateFilter.getFullYear();
      });

      if (existingRec) {
        return {
          ...existingRec,
          employeeName: emp.name,
          employeeEmail: emp.email,
          employeeDesignation: emp.designation,
          departmentName: emp.department?.name,
          isRecorded: true,
        };
      }

      return {
        id: `virtual-${empId}`,
        employeeId: { id: empId, name: emp.name, email: emp.email, designation: emp.designation },
        employeeName: emp.name,
        employeeEmail: emp.email,
        employeeDesignation: emp.designation,
        departmentName: emp.department?.name,
        userId: empId,
        date: dateFilter || new Date(),
        status: 'absent',
        checkIn: null,
        checkOut: null,
        notes: '',
        isRecorded: false,
      };
    });
  })();

  const presentCount = combinedRecords.filter(r => r.isRecorded && ['present', 'late', 'half_day'].includes(r.status)).length;
  const absentCount = combinedRecords.filter(r => !r.isRecorded || r.status === 'absent').length;
  const lateCount = combinedRecords.filter(r => r.isRecorded && (r.isLate || r.status === 'late')).length;

  const filteredAttendance = combinedRecords.filter(rec => {
    if (statusTab === 'present' && (!rec.isRecorded || !['present', 'late', 'half_day'].includes(rec.status))) return false;
    if (statusTab === 'absent' && (rec.isRecorded && rec.status !== 'absent')) return false;
    if (statusTab === 'late' && (!rec.isRecorded || (!rec.isLate && rec.status !== 'late'))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = rec.employeeName?.toLowerCase().includes(q);
      const matchEmail = rec.employeeEmail?.toLowerCase().includes(q);
      const matchDesig = rec.employeeDesignation?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDesig) return false;
    }
    return true;
  });

  const renderRecordsList = () => {
    if (loading) return <div className="text-center py-12 text-muted-foreground animate-pulse">Loading attendance records...</div>;
    if (filteredAttendance.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
          <Clock className="w-8 h-8 opacity-40" />
          <p className="font-medium">No attendance records found for this criteria.</p>
          {canViewAll && <p className="text-xs">Select another date or status tab to view records.</p>}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {filteredAttendance.map((record) => {
          const recId = record.id;
          const isVirtual = String(recId).startsWith('virtual-');
          const empId = record.employeeId?.id || record.userId;

          return (
            <div 
              key={recId} 
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3 transition-colors",
                record.isRecorded ? "hover:bg-muted/50 bg-card" : "bg-muted/15 border-dashed"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{record.employeeName || 'Unknown Employee'}</span>
                  {record.employeeDesignation && (
                    <span className="text-xs text-muted-foreground">({record.employeeDesignation})</span>
                  )}
                  {record.departmentName && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{record.departmentName}</Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{new Date(record.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>
                    Check In: <strong className="text-foreground">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Check Out: <strong className="text-foreground">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</strong>
                  </span>
                  {record.workingHours ? (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium text-foreground">
                      {record.workingHours} hrs
                    </span>
                  ) : null}
                </div>

                {record.notes && <div className="text-xs text-muted-foreground mt-1 italic">{record.notes}</div>}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {getStatusBadge(record.status, record.isRecorded)}

                {canViewAll && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-xs font-medium text-primary hover:bg-primary/10 gap-1 px-2.5"
                    onClick={() => {
                      setSelectedEmployeeId(empId.toString());
                    }}
                    title="View Monthly Attendance"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Monthly View
                  </Button>
                )}

                {isHR && (
                  <>
                    {isVirtual ? (
                      <Button size="sm" variant="outline" className="h-8 text-xs font-medium" onClick={() => handleMarkDirect(empId, 'present')}>
                        Mark Attendance
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(record)} title="Edit Attendance">
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleDelete(recId)} title="Delete Record">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const selectedEmp = employees.find(e => String(e.id) === String(selectedEmployeeId));

  const renderEmployeeMonthlyView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayIndex = getDay(monthStart);
    const paddingDays = Array.from({ length: startDayIndex }).fill(null);

    const getAttendanceForDay = (day: Date) => {
      return employeeMonthlyAttendance.find(a => isSameDay(new Date(a.date), day));
    };

    const monthlyPresent = employeeMonthlyAttendance.filter(a => a.status === 'present' || (!a.isHalfDay && a.checkIn)).length;
    const monthlyLeaves = employeeMonthlyAttendance.filter(a => a.status === 'leave').length;
    const monthlyLate = employeeMonthlyAttendance.filter(a => a.isLate || a.status === 'late').length;
    const monthlyHalfDay = employeeMonthlyAttendance.filter(a => a.isHalfDay || a.status === 'half_day').length;
    const monthlyWFH = employeeMonthlyAttendance.filter(a => a.isWFH || a.status === 'work_from_home').length;
    const monthlyLateMins = employeeMonthlyAttendance.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);
    const totalHours = employeeMonthlyAttendance.reduce((acc, a) => acc + (a.workingHours ? Number(a.workingHours) : 0), 0);

    const getStatusStyle = (record: any, isFutureDate: boolean, isSunday: boolean) => {
      if (!record) {
        if (isFutureDate) return { bg: 'bg-muted/20 border-dashed border-border/40 text-muted-foreground/60', label: 'Upcoming', badge: 'bg-muted/40 text-muted-foreground border-border/40' };
        if (isSunday) return { bg: 'bg-slate-500/5 border-slate-500/10 text-slate-500', label: 'Weekend', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-200' };
        return { bg: 'bg-red-500/5 border-red-500/20 text-red-600', label: 'Not Marked', badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200' };
      }
      if (record.status === 'leave') return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300', label: 'On Leave', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200' };
      if (record.status === 'late' || record.isLate) return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300', label: 'Late', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200' };
      if (record.isHalfDay || record.status === 'half_day') return { bg: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300', label: 'Half Day', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border-orange-200' };
      if (record.isWFH || record.status === 'work_from_home') return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300', label: 'WFH', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-200' };
      if (record.status === 'absent') return { bg: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300', label: 'Absent', badge: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border-red-200' };
      return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300', label: 'Present', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200' };
    };

    const handleOpenEditor = (day: Date, existingRecord?: any) => {
      if (!isHR) return;
      const dayStr = format(day, 'yyyy-MM-dd');
      if (dayStr > todayStr) {
        toast.error('Cannot mark attendance for a future date');
        return;
      }
      if (existingRecord && existingRecord.id && !existingRecord.id.startsWith('virtual-')) {
        handleEdit(existingRecord);
      } else {
        setEditingId(null);
        setFormData({
          employeeId: selectedEmployeeId,
          date: dayStr,
          status: existingRecord?.status || 'present',
          checkIn: existingRecord?.checkIn ? format(new Date(existingRecord.checkIn), 'HH:mm') : '09:00',
          checkOut: existingRecord?.checkOut ? format(new Date(existingRecord.checkOut), 'HH:mm') : '18:00',
          notes: existingRecord?.notes || ''
        });
        setPunchMode('both');
        setDialogOpen(true);
      }
    };

    return (
      <div className="space-y-6">
        {/* Employee Overview Card */}
        <Card className="border border-border/60 shadow-sm bg-card/80 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Employee Bio */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-primary/20 shrink-0">
                  {(selectedEmp?.name || selectedEmp?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold tracking-tight text-foreground truncate">
                      {selectedEmp?.name || selectedEmp?.email || 'Selected Employee'}
                    </h3>
                    {selectedEmp?.designation && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {selectedEmp.designation}
                      </Badge>
                    )}
                    {selectedEmp?.department?.name && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {selectedEmp.department.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>{selectedEmp?.email || 'No email registered'}</span>
                    <span>•</span>
                    <span>Role: {selectedEmp?.role || 'Staff'}</span>
                  </div>
                </div>
              </div>

              {/* Navigation & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center border rounded-lg bg-background p-0.5 shadow-xs">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs" 
                    onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
                  </Button>
                  <div className="px-2.5 py-1 font-semibold text-xs min-w-[120px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs" 
                    onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                    title="Next Month"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>

                {!isSameMonth(currentMonth, new Date()) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Current Month
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleExportCSV}
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedEmployeeId('all')}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to All Staff
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span>Present Days</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{monthlyPresent}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Full day attended</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
                <span>Leaves</span>
                <CalendarDays className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">{monthlyLeaves}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Approved leaves</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
                <span>Late Days</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">{monthlyLate}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{monthlyLateMins}m late total</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-orange-600 dark:text-orange-400">
                <span>Half Days</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-orange-700 dark:text-orange-300">{monthlyHalfDay}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Partial shifts</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-purple-600 dark:text-purple-400">
                <span>WFH</span>
                <Briefcase className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">{monthlyWFH}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Work from home</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span>Total Hours</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-1 text-indigo-700 dark:text-indigo-300">{totalHours.toFixed(1)}h</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Logged work time</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Attendance Records: Calendar or Table */}
        {monthlyLoading ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading {selectedEmp?.name || selectedEmp?.email || 'employee'}&apos;s monthly attendance records...</p>
            </div>
          </Card>
        ) : viewMode === 'calendar' ? (
          <Card className="shadow-lg border bg-card text-card-foreground overflow-hidden">
            <CardHeader className="py-3.5 px-5 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Monthly Calendar: {format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <CardDescription className="text-xs">
                  {isHR ? 'Click any past or present day to edit or mark attendance.' : 'Visual calendar overview of daily punches and status.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Late</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Leave</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Absent</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 bg-muted/40 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y border-b">
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="p-2 bg-muted/10 min-h-[96px]" />
                ))}
                {daysInMonth.map(day => {
                  const att = getAttendanceForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isSunday = getDay(day) === 0;
                  const isFuture = day > new Date();
                  const style = getStatusStyle(att, isFuture, isSunday);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => !isFuture && isHR && handleOpenEditor(day, att)}
                      className={cn(
                        "p-2 min-h-[105px] flex flex-col justify-between transition-all relative group",
                        isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : "hover:bg-muted/30",
                        !isFuture && isHR && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                          isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {isHR && !isFuture && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary flex items-center gap-0.5">
                            <Edit className="w-3 h-3" /> Edit
                          </span>
                        )}
                      </div>

                      {att ? (
                        <div className={cn("mt-1.5 p-1.5 rounded-md border text-[11px] space-y-0.5 shadow-xs", style.bg, style.border, style.text)}>
                          <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wide">
                            <span>{style.label}</span>
                            {att.workingHours ? <span>{Number(att.workingHours).toFixed(1)}h</span> : null}
                          </div>
                          {att.checkIn && (
                            <div className="text-[10px] flex items-center justify-between">
                              <span className="opacity-80">In:</span>
                              <span className="font-medium font-mono">{format(new Date(att.checkIn), 'HH:mm')}</span>
                            </div>
                          )}
                          {att.checkOut && (
                            <div className="text-[10px] flex items-center justify-between">
                              <span className="opacity-80">Out:</span>
                              <span className="font-medium font-mono">{format(new Date(att.checkOut), 'HH:mm')}</span>
                            </div>
                          )}
                          {att.isLate && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                              +{att.lateMinutes || 0}m late
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-auto py-1 text-center">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium border", style.badge)}>
                            {style.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border bg-card text-card-foreground">
            <CardHeader className="py-3.5 px-5 bg-muted/20 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Monthly Breakdown: {format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <CardDescription className="text-xs">
                  Detailed day-by-day record of punches, working hours, and notes for {selectedEmp?.name || selectedEmp?.email || 'this employee'}.
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {daysInMonth.length} Days in Month • {employeeMonthlyAttendance.length} Recorded
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[140px] text-xs">Date</TableHead>
                      <TableHead className="w-[100px] text-xs">Day</TableHead>
                      <TableHead className="w-[130px] text-xs">Status</TableHead>
                      <TableHead className="text-xs">Check In</TableHead>
                      <TableHead className="text-xs">Check Out</TableHead>
                      <TableHead className="text-xs">Working Hours</TableHead>
                      <TableHead className="text-xs">Late Minutes</TableHead>
                      <TableHead className="text-xs">Notes / Remarks</TableHead>
                      {isHR && <TableHead className="w-[90px] text-right text-xs">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daysInMonth.map((day) => {
                      const att = getAttendanceForDay(day);
                      const isToday = isSameDay(day, new Date());
                      const isSunday = getDay(day) === 0;
                      const isFuture = day > new Date();
                      const style = getStatusStyle(att, isFuture, isSunday);

                      return (
                        <TableRow key={day.toISOString()} className={cn(isToday && "bg-primary/5 font-medium")}>
                          <TableCell className="text-xs font-semibold">
                            <span className={cn(isToday && "text-primary font-bold")}>
                              {format(day, 'dd MMM yyyy')}
                            </span>
                            {isToday && <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1 border-primary text-primary">Today</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(day, 'EEEE')}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[11px] font-medium border", style.badge)}>
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {att?.checkIn ? format(new Date(att.checkIn), 'HH:mm') : <span className="text-muted-foreground/50">--:--</span>}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {att?.checkOut ? format(new Date(att.checkOut), 'HH:mm') : <span className="text-muted-foreground/50">--:--</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {att?.workingHours ? `${Number(att.workingHours).toFixed(1)} hrs` : <span className="text-muted-foreground/50">--</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {att?.lateMinutes ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">+{att.lateMinutes}m</span>
                            ) : (
                              <span className="text-muted-foreground/50">0m</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {att?.notes || <span className="text-muted-foreground/40 italic">None</span>}
                          </TableCell>
                          {isHR && (
                            <TableCell className="text-right">
                              {!isFuture ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                                  onClick={() => handleOpenEditor(day, att)}
                                >
                                  {att ? 'Edit' : 'Mark'}
                                </Button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/40">--</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {selectedEmployeeId !== 'all' 
              ? (selectedEmp ? `${selectedEmp.name || selectedEmp.email}'s Attendance` : 'Employee Attendance')
              : isPersonalView 
                ? 'My Attendance' 
                : canViewAll 
                  ? 'Attendance Management' 
                  : 'My Attendance Records'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {selectedEmployeeId !== 'all'
              ? `Monthly overview and attendance records for ${format(currentMonth, 'MMMM yyyy')}`
              : isPersonalView 
                ? 'Review your personal check-ins, punches, and work hours' 
                : canViewAll 
                  ? 'Track daily attendance, absentees, and punch time' 
                  : 'Your personal attendance history'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="border rounded-md">
            <ToggleGroupItem value="list" aria-label="List view" className="px-3" title="List View">
              <LayoutList className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="px-3" title="Calendar View">
              <CalendarDays className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Employee Dropdown Selection (Req: Employee dropdown to view monthly attendance) */}
          {canViewAll && (
            <div className="flex items-center gap-1.5">
              <Select value={selectedEmployeeId} onValueChange={(v) => setSelectedEmployeeId(v)}>
                <SelectTrigger className="w-[200px] sm:w-[250px] h-9 text-xs font-medium">
                  <div className="flex items-center gap-2 truncate">
                    {selectedEmployeeId === 'all' ? (
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                    <SelectValue placeholder="All Staff (Daily View)" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" /> All Staff (Daily View)
                    </span>
                  </SelectItem>
                  {employees.filter(e => e && e.id).map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name || emp.email}{emp.designation ? ` (${emp.designation})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployeeId !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setSelectedEmployeeId('all')}
                  title="Reset to All Staff (Daily View)"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* If viewing All Staff: show Single-day date picker; If viewing individual employee: show Month selector */}
          {selectedEmployeeId === 'all' ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal text-xs", !dateFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : <span>Filter by date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
                <div className="p-2 border-t flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => setDateFilter(new Date())} className="w-full text-xs">
                    Reset to Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center border rounded-md p-0.5 bg-background shadow-xs">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} 
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-semibold px-2 min-w-[110px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} 
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={handleExportCSV} className="gap-1.5 text-xs font-medium border-dashed">
            <Download className="w-4 h-4" /> Export Report
          </Button>

          {canViewAll && (
            <Button 
              variant="outline" 
              onClick={() => {
                setViewMode('calendar');
                if (selectedEmployeeId === 'all' && employees.length > 0) {
                  setSelectedEmployeeId(employees[0].id.toString());
                }
              }} 
              className={cn(
                "gap-1.5 text-xs font-medium",
                viewMode === 'calendar' ? "bg-primary/10 text-primary border-primary/30" : "text-primary hover:bg-primary/10"
              )}
            >
              <CalendarDays className="w-4 h-4 text-primary" /> Monthly Calendar View
            </Button>
          )}

          {isHR && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="premium-gradient text-white"><Plus className="w-4 h-4 mr-2" />Mark Attendance</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div>
                    <Label>Employee <span className="text-destructive">*</span></Label>
                    <Select value={formData.employeeId} onValueChange={(value) => setFormData({...formData, employeeId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(emp => emp && emp.id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name || emp.email}{emp.designation ? ` (${emp.designation})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Date <span className="text-destructive">*</span></Label>
                      <Input 
                        type="date" 
                        value={formData.date} 
                        max={todayStr}
                        onChange={(e) => setFormData({...formData, date: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Attendance Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Punch Mode Selection (Req 2) */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Punch Entry Mode</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={punchMode === 'both' ? 'default' : 'outline'}
                        className="text-xs h-8 px-2"
                        onClick={() => setPunchMode('both')}
                      >
                        Both (In & Out)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={punchMode === 'checkInOnly' ? 'default' : 'outline'}
                        className="text-xs h-8 px-2"
                        onClick={() => { setPunchMode('checkInOnly'); setFormData(f => ({ ...f, checkOut: '' })); }}
                      >
                        Check In Only
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={punchMode === 'checkOutOnly' ? 'default' : 'outline'}
                        className="text-xs h-8 px-2"
                        onClick={() => { setPunchMode('checkOutOnly'); setFormData(f => ({ ...f, checkIn: '' })); }}
                      >
                        Check Out Only
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={punchMode === 'statusOnly' ? 'default' : 'outline'}
                        className="text-xs h-8 px-2"
                        onClick={() => { setPunchMode('statusOnly'); setFormData(f => ({ ...f, checkIn: '', checkOut: '' })); }}
                      >
                        Status Only
                      </Button>
                    </div>
                  </div>

                  {/* Time Inputs */}
                  {punchMode !== 'statusOnly' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className={punchMode === 'checkOutOnly' ? 'text-muted-foreground' : ''}>Check In Time</Label>
                        <Input 
                          type="time" 
                          value={formData.checkIn} 
                          disabled={punchMode === 'checkOutOnly'}
                          onChange={(e) => setFormData({...formData, checkIn: e.target.value})} 
                        />
                      </div>
                      <div>
                        <Label className={punchMode === 'checkInOnly' ? 'text-muted-foreground' : ''}>Check Out Time</Label>
                        <Input 
                          type="time" 
                          value={formData.checkOut} 
                          disabled={punchMode === 'checkInOnly'}
                          onChange={(e) => setFormData({...formData, checkOut: e.target.value})} 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Notes / Remarks</Label>
                    <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="e.g. Regularized by HR, field work" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 premium-gradient text-white">Save Attendance</Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Conditionally Render: Individual Employee Monthly View vs All Staff Daily View */}
      {selectedEmployeeId !== 'all' ? (
        renderEmployeeMonthlyView()
      ) : (
        <>
          {canViewAll && (
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Status Tabs */}
                  <Tabs value={statusTab} onValueChange={(v: any) => setStatusTab(v)}>
                    <TabsList className="h-9">
                      <TabsTrigger value="all" className="text-xs">All ({combinedRecords.length})</TabsTrigger>
                      <TabsTrigger value="present" className="text-xs text-emerald-600 dark:text-emerald-400">Present ({presentCount})</TabsTrigger>
                      <TabsTrigger value="absent" className="text-xs text-red-600 dark:text-red-400">Absent ({absentCount})</TabsTrigger>
                      <TabsTrigger value="late" className="text-xs text-amber-600 dark:text-amber-400">Late ({lateCount})</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Search bar */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, designation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Records List / Calendar */}
          {viewMode === 'calendar' ? (
            <div className="grid md:grid-cols-[auto_1fr] gap-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Attendance Calendar</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-6">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    disabled={(date) => date > new Date()}
                    className="rounded-md border shadow-sm"
                    modifiers={{
                      present: attendance.filter(a => a.status === 'present').map(a => new Date(a.date)),
                      absent: attendance.filter(a => a.status === 'absent').map(a => new Date(a.date)),
                      late: attendance.filter(a => a.status === 'late').map(a => new Date(a.date)),
                      half_day: attendance.filter(a => a.status === 'half_day').map(a => new Date(a.date)),
                      leave: attendance.filter(a => a.status === 'leave').map(a => new Date(a.date)),
                    }}
                    modifiersClassNames={{
                      present: 'bg-green-100 text-green-900 font-bold',
                      absent: 'bg-red-100 text-red-900 font-bold',
                      late: 'bg-yellow-100 text-yellow-900 font-bold',
                      half_day: 'bg-blue-100 text-blue-900 font-bold',
                      leave: 'bg-purple-100 text-purple-900 font-bold',
                    }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{dateFilter ? format(dateFilter, "PPP") : 'All Dates'} Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderRecordsList()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle>{dateFilter ? format(dateFilter, "PPP") : 'All Dates'} Attendance</CardTitle>
                <CardDescription>
                  Showing {filteredAttendance.length} records • {presentCount} Present, {absentCount} Absent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderRecordsList()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
