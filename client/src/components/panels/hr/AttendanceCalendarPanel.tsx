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
      const res = await api.get('/hr/employees');
      setEmployees(res.data.data || []);
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
  const startDate = monthStart; 
  const endDate = monthEnd;

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const startDayIndex = getDay(monthStart);
  const paddingDays = Array.from({ length: startDayIndex }).fill(null);

  const getAttendanceForDay = (day: Date) => {
    return attendanceData.find(a => isSameDay(new Date(a.date), day));
  };

  const getStatusColor = (attendance: any) => {
    if (!attendance) return 'bg-gray-100 text-gray-500';
    if (attendance.status === 'absent') return 'bg-red-100 border-red-200 text-red-700';
    if (attendance.status === 'leave') return 'bg-blue-100 border-blue-200 text-blue-700';
    if (attendance.status === 'late' || attendance.isLate) return 'bg-orange-100 border-orange-200 text-orange-700';
    if (attendance.isWFH) return 'bg-purple-100 border-purple-200 text-purple-700';
    if (attendance.isHalfDay) return 'bg-yellow-100 border-yellow-200 text-yellow-700';
    return 'bg-green-100 border-green-200 text-green-700'; // present
  };

  return (
    <Card className="shadow-lg border-0 bg-white/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Attendance Calendar
        </CardTitle>
        <div className="flex gap-4">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Select Employee --</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.userId}>{emp.user?.name || emp.userId}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4 mr-1"/> Prev</Button>
          <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>Next <ChevronRight className="w-4 h-4 ml-1"/></Button>
        </div>

        {selectedEmployee !== 'all' ? (
          <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} className="p-4 border-b border-r bg-gray-50/30 min-h-[100px]"></div>
              ))}
              {days.map((day, i) => {
                const att = getAttendanceForDay(day);
                const colorClass = getStatusColor(att);
                const isToday = isSameDay(day, new Date());

                return (
                  <div key={day.toISOString()} className={`p-3 border-b border-r min-h-[100px] flex flex-col transition-colors ${isToday ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
                    <div className="text-right mb-2">
                      <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white px-2 py-1 rounded-full' : 'text-gray-600'}`}>
                        {format(day, dateFormat)}
                      </span>
                    </div>
                    {att ? (
                      <div className={`mt-auto text-xs p-2 rounded-md border ${colorClass} flex flex-col gap-1`}>
                        <span className="font-semibold uppercase tracking-wider">{att.status}</span>
                        {att.checkIn && <span>In: {format(new Date(att.checkIn), 'HH:mm')}</span>}
                        {att.checkOut && <span>Out: {format(new Date(att.checkOut), 'HH:mm')}</span>}
                        {att.isLate && <span className="text-orange-800 font-medium">Late by {att.lateMinutes}m</span>}
                        {att.isHalfDay && <span className="text-yellow-800">Half Day</span>}
                        {att.isWFH && <span className="text-purple-800">WFH</span>}
                      </div>
                    ) : (
                      <div className="mt-auto text-xs text-gray-400 text-center">No Data</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="text-lg">Please select an employee to view their attendance calendar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
