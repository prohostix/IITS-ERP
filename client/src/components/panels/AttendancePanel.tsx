import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CalendarIcon, LayoutList, CalendarDays, Search, Clock, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPunchMode('both');
    setFormData({
      employeeId: '',
      date: todayStr,
      status: 'present',
      checkIn: '',
      checkOut: '',
      notes: ''
    });
  };

  const handleExportCSV = () => {
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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isPersonalView ? 'My Attendance' : canViewAll ? 'Attendance Management' : 'My Attendance Records'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isPersonalView ? 'Review your personal check-ins, punches, and work hours' : canViewAll ? 'Track daily attendance, absentees, and punch time' : 'Your personal attendance history'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="border rounded-md">
            <ToggleGroupItem value="list" aria-label="List view" className="px-3">
              <LayoutList className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="px-3">
              <CalendarDays className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[230px] justify-start text-left font-normal", !dateFilter && "text-muted-foreground")}>
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

          <Button variant="outline" onClick={handleExportCSV} className="gap-1.5 text-xs font-medium border-dashed">
            <Download className="w-4 h-4" /> Export Report
          </Button>

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
    </div>
  );
}
