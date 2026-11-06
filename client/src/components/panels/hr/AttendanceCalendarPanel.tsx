import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function AttendanceCalendarPanel() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee !== 'all') {
      fetchAttendance();
    } else {
      setAttendanceData([]);
    }
  }, [selectedEmployee, currentDate]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      const allUsers = res.data.data || [];
      const filtered = allUsers.filter((u: any) => !['superadmin', 'student', 'center_admin'].includes(u.role));
      setEmployees(filtered);
    } catch (e: any) {
      toast.error('Failed to load employees');
    }
  };

  const fetchAttendance = async () => {
    try {
      const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const res = await api.get(`/hr/attendance?employeeId=${selectedEmployee}&startDate=${monthStart}&endDate=${monthEnd}`);
      setAttendanceData(res.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load attendance');
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayIndex = getDay(monthStart);
  const paddingDays = Array.from({ length: startDayIndex }).fill(null);

  const getAttendanceForDay = (day: Date) => {
    return attendanceData.find(a => isSameDay(new Date(a.date), day));
  };

  const getStatusColor = (attendance: any) => {
    if (!attendance) return 'bg-muted text-muted-foreground border-transparent';
    if (attendance.status === 'absent') return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
    if (attendance.status === 'leave') return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
    if (attendance.status === 'late' || attendance.isLate) return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    if (attendance.isWFH) return 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400';
    if (attendance.isHalfDay) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
    return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
  };

  const presentCount = attendanceData.filter(a => a.status === 'present' || (!a.isHalfDay && a.checkIn)).length;
  const lateCount = attendanceData.filter(a => a.isLate || a.status === 'late').length;
  const halfDayCount = attendanceData.filter(a => a.isHalfDay || a.status === 'half_day').length;
  const wfhCount = attendanceData.filter(a => a.isWFH || a.status === 'work_from_home').length;
  const totalLateMins = attendanceData.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);

  return (
    <Card className="shadow-lg border bg-card text-card-foreground">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Attendance Calendar Overview
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly drill-down showing daily punches, late minutes, and working hours</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Select Employee --</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} {emp.designation ? `(${emp.designation})` : `(${emp.role})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4 mr-1"/> Prev</Button>
          <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>Next <ChevronRight className="w-4 h-4 ml-1"/></Button>
        </div>

        {selectedEmployee !== 'all' ? (
          <div className="space-y-6">
            {/* Monthly KPI Stats Strip (Req 39: SalaryBox style overview) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl border bg-green-500/10 border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground">Present Days</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
              </div>
              <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-center">
                <p className="text-xs text-muted-foreground">Late Days</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{lateCount}</p>
              </div>
              <div className="p-3 rounded-xl border bg-yellow-500/10 border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground">Half Days</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{halfDayCount}</p>
              </div>
              <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/20 text-center">
                <p className="text-xs text-muted-foreground">Work From Home</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{wfhCount}</p>
              </div>
              <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/20 text-center col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Total Late Mins</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{totalLateMins}m</p>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 bg-muted/40 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="p-3 border-b border-r bg-muted/10 min-h-[90px]"></div>
                ))}
                {days.map((day) => {
                  const att = getAttendanceForDay(day);
                  const colorClass = getStatusColor(att);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2.5 border-b border-r min-h-[95px] flex flex-col transition-colors ${
                        isToday ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="text-right mb-1.5">
                        <span
                          className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                      {att ? (
                        <div className={`mt-auto text-[11px] p-1.5 rounded-md border ${colorClass} flex flex-col gap-0.5`}>
                          <span className="font-bold uppercase tracking-wider text-[10px]">{att.status}</span>
                          {att.checkIn && <span>In: {format(new Date(att.checkIn), 'HH:mm')}</span>}
                          {att.checkOut && <span>Out: {format(new Date(att.checkOut), 'HH:mm')}</span>}
                          {att.isLate && <span className="text-amber-600 dark:text-amber-400 font-medium">+{att.lateMinutes}m late</span>}
                          {att.isHalfDay && <span>Half Day</span>}
                          {att.isWFH && <span>WFH</span>}
                        </div>
                      ) : (
                        <div className="mt-auto text-[10px] text-muted-foreground/40 text-center py-1">No punch</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="text-base font-medium">Select an employee from the dropdown above to view their monthly attendance overview.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
