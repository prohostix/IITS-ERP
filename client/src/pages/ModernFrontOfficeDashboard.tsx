import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Building2, 
  CheckCircle2, 
  UserPlus, 
  Plus, 
  DoorOpen, 
  Bell, 
  Briefcase,
  Layers,
  ArrowRight,
  Phone,
  Mail,
  FileText,
  Sparkles,
  MapPin,
  LogOut,
  RefreshCw,
  AlertCircle,
  Check,
  Search,
  ChevronRight,
  Coffee,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { VisitorManagementPanel } from '@/components/panels/VisitorManagementPanel';
import { RoomBookingPanel } from '@/components/panels/RoomBookingPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { TADAClaimsPanel } from '@/components/panels/TADAClaimsPanel';
import { toast } from 'sonner';
import api from '@/lib/api';

interface HostUser {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: { id: string; name: string; type: string };
  branch?: { id: string; name: string; code: string };
}

interface Visitor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  visitDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInAt?: string;
  checkOutAt?: string;
  purpose: string;
  hostUserId?: string;
  hostUser?: HostUser;
  idProofType?: string;
  idProofNumber?: string;
  passNumber?: string;
  status: 'checked_in' | 'checked_out' | 'scheduled' | 'cancelled';
  remarks?: string;
  createdAt: string;
}

interface MeetingRoom {
  id: string;
  name: string;
  code?: string;
  floor?: string;
  capacity: number;
  amenities: string[];
  status: 'active' | 'maintenance' | 'inactive';
  description?: string;
  todayBookingsCount?: number;
  isCurrentlyOccupied?: boolean;
  currentMeeting?: any;
  nextMeeting?: any;
}

interface RoomBooking {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount?: number;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  remarks?: string;
  room?: MeetingRoom;
  user?: HostUser;
  bookedBy?: { id: string; name: string; role: string };
  createdAt: string;
}

const COMMON_PURPOSES = [
  'Official Meeting',
  'Job Interview',
  'Student / Parent Inquiry',
  'Vendor / Supplier Visit',
  'Campus / Facility Tour',
  'Document Submission',
  'Courier / Delivery',
  'Personal Visit',
  'Other',
];

const STANDARD_TIMES = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM',
];

export function ModernFrontOfficeDashboard({
  initialTab,
  onNavigate,
}: {
  initialTab?: string;
  onNavigate?: (tab: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [loading, setLoading] = useState(true);

  // Core Data
  const [metrics, setMetrics] = useState({
    todayVisitors: 0,
    activeVisitors: 0,
    todayBookings: 0,
    totalRooms: 0,
    activeRooms: 0,
  });
  const [todayVisitors, setTodayVisitors] = useState<Visitor[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [todayBookings, setTodayBookings] = useState<RoomBooking[]>([]);
  const [hosts, setHosts] = useState<HostUser[]>([]);

  // Dialogs
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [submittingVisitor, setSubmittingVisitor] = useState(false);
  const [visitorFormData, setVisitorFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    visitDate: new Date().toISOString().split('T')[0],
    checkInTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    purpose: 'Official Meeting',
    customPurpose: '',
    hostUserId: '',
    idProofType: 'Aadhar',
    idProofNumber: '',
    passNumber: '',
    remarks: '',
  });

  const [bookRoomModalOpen, setBookRoomModalOpen] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [bookingFormData, setBookingFormData] = useState({
    roomId: '',
    userId: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    attendeesCount: 4,
    remarks: '',
  });

  const [hostSearch, setHostSearch] = useState('');

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [visitorRes, roomsRes, bookingsRes, hostsRes] = await Promise.all([
        api.get('/front-office/visitors', { params: { date: today } }).catch(() => ({ data: { data: [], stats: {} } })),
        api.get('/front-office/rooms').catch(() => ({ data: { data: [] } })),
        api.get('/front-office/bookings', { params: { date: today } }).catch(() => ({ data: { data: [] } })),
        api.get('/front-office/hosts').catch(() => ({ data: { data: [] } })),
      ]);

      const vList: Visitor[] = visitorRes.data.data || [];
      const vStats = visitorRes.data.stats || {};
      const rList: MeetingRoom[] = roomsRes.data.data || [];
      const bList: RoomBooking[] = bookingsRes.data.data || [];
      const hList: HostUser[] = hostsRes.data.data || [];

      setTodayVisitors(vList);
      setActiveVisitors(vList.filter(v => v.status === 'checked_in'));
      setRooms(rList);
      setTodayBookings(bList.filter(b => b.status !== 'cancelled'));
      setHosts(hList);

      setMetrics({
        todayVisitors: vStats.totalToday || vList.length,
        activeVisitors: vStats.activeNow || vList.filter(v => v.status === 'checked_in').length,
        todayBookings: bList.filter(b => b.status !== 'cancelled').length,
        totalRooms: rList.length,
        activeRooms: rList.filter(r => !r.isCurrentlyOccupied && r.status === 'active').length,
      });
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' ? 'dashboard' : tab);
    }
  };

  const openCheckInModal = () => {
    setVisitorFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      visitDate: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      purpose: 'Official Meeting',
      customPurpose: '',
      hostUserId: hosts[0]?.id || '',
      idProofType: 'Aadhar',
      idProofNumber: '',
      passNumber: '',
      remarks: '',
    });
    setHostSearch('');
    setCheckInModalOpen(true);
  };

  const openBookRoomModal = (preselectedRoomId?: string) => {
    setConflictError(null);
    setBookingFormData({
      roomId: preselectedRoomId || (rooms[0]?.id || ''),
      userId: hosts[0]?.id || '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      attendeesCount: 4,
      remarks: '',
    });
    setHostSearch('');
    setBookRoomModalOpen(true);
  };

  const handleCreateVisitor = async () => {
    if (!visitorFormData.name.trim()) {
      toast.error('Please enter the visitor name');
      return;
    }

    const finalPurpose = visitorFormData.purpose === 'Other' && visitorFormData.customPurpose.trim()
      ? visitorFormData.customPurpose.trim()
      : visitorFormData.purpose;

    setSubmittingVisitor(true);
    try {
      const payload = {
        name: visitorFormData.name.trim(),
        phone: visitorFormData.phone.trim() || undefined,
        email: visitorFormData.email.trim() || undefined,
        company: visitorFormData.company.trim() || undefined,
        visitDate: visitorFormData.visitDate,
        checkInTime: visitorFormData.checkInTime,
        purpose: finalPurpose,
        hostUserId: visitorFormData.hostUserId || undefined,
        idProofType: visitorFormData.idProofType || undefined,
        idProofNumber: visitorFormData.idProofNumber || undefined,
        passNumber: visitorFormData.passNumber || undefined,
        remarks: visitorFormData.remarks || undefined,
      };

      await api.post('/front-office/visitors', payload);
      toast.success(`Visitor ${visitorFormData.name} checked in successfully!`);
      setCheckInModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to check in visitor');
    } finally {
      setSubmittingVisitor(false);
    }
  };

  const handleQuickCheckOut = async (visitor: Visitor) => {
    try {
      await api.patch(`/front-office/visitors/${visitor.id}/checkout`);
      toast.success(`${visitor.name} checked out successfully`);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to check out visitor');
    }
  };

  const handleCreateBooking = async () => {
    if (!bookingFormData.roomId) {
      toast.error('Please select a meeting room');
      return;
    }
    if (!bookingFormData.userId) {
      toast.error('Please select a meeting host / organizer');
      return;
    }
    if (!bookingFormData.title.trim()) {
      toast.error('Please enter a meeting title or agenda');
      return;
    }

    setSubmittingBooking(true);
    setConflictError(null);
    try {
      await api.post('/front-office/bookings', bookingFormData);
      toast.success('Meeting room booked successfully! Reflected on host dashboard.');
      setBookRoomModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to book meeting room';
      setConflictError(msg);
      toast.error(msg);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/front-office/bookings/${id}/status`, { status });
      toast.success(`Booking status updated to ${status}`);
      fetchDashboardData();
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const filteredHosts = hosts.filter(h => {
    if (!hostSearch.trim()) return true;
    const q = hostSearch.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.role.toLowerCase().includes(q) ||
      (h.designation && h.designation.toLowerCase().includes(q)) ||
      (h.department?.name && h.department.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <DashboardHero
        title="Front Office & Reception Command"
        badge="Front Office Admin"
        description="Enter visitor details, book meeting rooms, track live office arrivals, and coordinate reception operations."
        metrics={[
          { label: "Today's Visitors", value: metrics.todayVisitors, change: 'Guests Logged', isPositive: true },
          { label: 'Currently in Office', value: metrics.activeVisitors, change: 'Active Visitors', isPositive: true },
          { label: "Today's Room Bookings", value: metrics.todayBookings, change: 'Scheduled', isPositive: true },
          { label: 'Available Rooms', value: `${metrics.activeRooms}/${metrics.totalRooms}`, change: 'Ready to Book', isPositive: true },
        ]}
        primaryAction={{
          label: 'Check In Visitor',
          icon: <UserPlus className="w-4 h-4 mr-2" />,
          onClick: openCheckInModal,
        }}
        secondaryAction={{
          label: 'Book Meeting Room',
          icon: <Calendar className="w-4 h-4 mr-2" />,
          onClick: () => openBookRoomModal(),
        }}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="relative">
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden no-scrollbar h-auto py-1 gap-1 bg-transparent border-b rounded-none flex-nowrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              Overview
            </TabsTrigger>
            <TabsTrigger value="visitors" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              Visitor Logbook
            </TabsTrigger>
            <TabsTrigger value="meeting_rooms" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              Meeting Room Bookings
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              My Leaves
            </TabsTrigger>
            <TabsTrigger value="my_tada" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              My TA/DA Claims
            </TabsTrigger>
            <TabsTrigger value="my_documents" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              My Documents
            </TabsTrigger>
            <TabsTrigger value="holidays" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              Holidays
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg font-medium">
              Announcements
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -------------------- OVERVIEW TAB -------------------- */}
        <TabsContent value="overview" className="space-y-6">
          {/* 1. Meeting Rooms Live Status Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Meeting Rooms Live Status</h3>
                <span className="text-xs text-muted-foreground">({metrics.activeRooms} available now)</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleTabChange('meeting_rooms')}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              >
                All Rooms & Schedule <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {rooms.length === 0 ? (
              <Card className="border border-dashed shadow-none bg-muted/20">
                <CardContent className="p-4 text-center text-xs text-muted-foreground">
                  No meeting rooms configured yet. Rooms can be added from the Org Admin portal.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rooms.map(room => {
                  const isOccupied = room.isCurrentlyOccupied;
                  return (
                    <Card 
                      key={room.id} 
                      className={`border shadow-sm transition-all hover:shadow-md ${
                        isOccupied 
                          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10' 
                          : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                      }`}
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground leading-snug">{room.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {room.floor ? `${room.floor} • ` : ''}Capacity: {room.capacity} seats
                            </p>
                          </div>
                          {isOccupied ? (
                            <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse" /> In Use
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Available
                            </Badge>
                          )}
                        </div>

                        {/* Meeting info or Quick book */}
                        <div className="pt-1 text-xs border-t border-border/40 flex items-center justify-between">
                          {isOccupied && room.currentMeeting ? (
                            <div className="truncate max-w-[170px]" title={room.currentMeeting.title}>
                              <span className="font-medium text-foreground">{room.currentMeeting.title}</span>
                              <span className="text-[11px] text-muted-foreground block">Until {room.currentMeeting.endTime}</span>
                            </div>
                          ) : room.nextMeeting ? (
                            <div className="truncate max-w-[170px]">
                              <span className="text-muted-foreground">Next: </span>
                              <span className="font-medium text-foreground">{room.nextMeeting.startTime}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Free rest of today</span>
                          )}

                          <Button
                            size="sm"
                            variant={isOccupied ? "outline" : "default"}
                            className="h-6 text-[11px] px-2"
                            onClick={() => openBookRoomModal(room.id)}
                          >
                            Book
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Core Reception Deck: Active Guests & Today's Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Currently in Office (Active Guests) */}
            <Card className="border shadow-sm flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Currently in Office
                    {activeVisitors.length > 0 && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
                        {activeVisitors.length} Active {activeVisitors.length === 1 ? 'Guest' : 'Guests'}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Guests and visitors currently signed in at reception
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleTabChange('visitors')}
                  className="text-xs h-8"
                >
                  Visitor Logbook <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                {activeVisitors.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center my-auto">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">No visitors in office right now</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                      All guests have checked out or no visits are ongoing. Reception is all clear!
                    </p>
                    <Button 
                      size="sm" 
                      onClick={openCheckInModal} 
                      className="mt-4 text-xs h-8 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Check In New Visitor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeVisitors.map(visitor => (
                      <div 
                        key={visitor.id} 
                        className="p-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                            {visitor.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-foreground truncate">{visitor.name}</h5>
                              {visitor.company && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                  {visitor.company}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 py-0 px-1.5">
                                {visitor.purpose}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                              <span>
                                <strong className="font-medium text-foreground">Meeting:</strong> {visitor.hostUser?.name || 'Staff Member'}
                                {visitor.hostUser?.department?.name && ` (${visitor.hostUser.department.name})`}
                              </span>
                              {visitor.checkInTime && (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Clock className="w-3 h-3 text-muted-foreground" /> In: {visitor.checkInTime}
                                </span>
                              )}
                              {visitor.phone && (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Phone className="w-3 h-3 text-muted-foreground" /> {visitor.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickCheckOut(visitor)}
                          className="shrink-0 h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Check Out
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RIGHT: Today's Meeting Schedule */}
            <Card className="border shadow-sm flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Today's Meeting Schedule
                    {todayBookings.length > 0 && (
                      <Badge variant="secondary" className="font-medium text-xs">
                        {todayBookings.length} {todayBookings.length === 1 ? 'Meeting' : 'Meetings'}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Room reservations reflected on host employee dashboards
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleTabChange('meeting_rooms')}
                  className="text-xs h-8"
                >
                  All Bookings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                {todayBookings.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center my-auto">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 mb-3">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">No meetings scheduled today</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                      Conference rooms are open and free for reservations or ad-hoc bookings.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => openBookRoomModal()} 
                      className="mt-4 text-xs h-8 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Book a Meeting Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayBookings.map(booking => {
                      const isNow = booking.status === 'in_progress';
                      return (
                        <div 
                          key={booking.id}
                          className="p-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
                                {booking.startTime} - {booking.endTime}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                {booking.room?.name || 'Room'}
                              </Badge>
                              {isNow ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                                  In Progress
                                </Badge>
                              ) : booking.status === 'completed' ? (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                                  Confirmed
                                </Badge>
                              )}
                            </div>

                            <h5 className="text-sm font-semibold text-foreground mt-1 truncate">{booking.title}</h5>

                            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>
                                <strong className="font-medium text-foreground">Host:</strong> {booking.user?.name || 'Employee'}
                              </span>
                              {booking.attendeesCount && (
                                <span>• 👥 {booking.attendeesCount} attendees</span>
                              )}
                            </p>
                          </div>

                          {booking.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateBookingStatus(booking.id, booking.status === 'in_progress' ? 'completed' : 'in_progress')}
                              className="h-7 text-xs px-2 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              {booking.status === 'in_progress' ? 'Mark Completed' : 'Start'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. Bottom Table: Today's Full Visitor Log */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Today's Visitor Logbook
                  <span className="text-xs font-normal text-muted-foreground">({todayVisitors.length} entries today)</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Record of all visitors who arrived or checked in today
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={openCheckInModal} className="h-8 text-xs">
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> + Check In
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleTabChange('visitors')} className="h-8 text-xs">
                  Full History & CSV <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {todayVisitors.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No visitors have checked in today yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2.5 px-3 font-medium">Visitor</th>
                        <th className="py-2.5 px-3 font-medium">Contact</th>
                        <th className="py-2.5 px-3 font-medium">Host Employee</th>
                        <th className="py-2.5 px-3 font-medium">Purpose</th>
                        <th className="py-2.5 px-3 font-medium">Check In</th>
                        <th className="py-2.5 px-3 font-medium">Check Out</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {todayVisitors.map(v => (
                        <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {v.name}
                            {v.company && (
                              <span className="block text-[11px] text-muted-foreground font-normal">{v.company}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {v.phone || v.email || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-foreground">{v.hostUser?.name || 'Unassigned'}</span>
                            {v.hostUser?.department?.name && (
                              <span className="block text-[11px] text-muted-foreground">{v.hostUser.department.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {v.purpose}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                            {v.checkInTime || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                            {v.checkOutTime || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {v.status === 'checked_in' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px]">
                                In Office
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Checked Out
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {v.status === 'checked_in' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickCheckOut(v)}
                                className="h-6 text-[11px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              >
                                Check Out
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- DEDICATED FULL PANELS -------------------- */}
        <TabsContent value="visitors">
          <VisitorManagementPanel />
        </TabsContent>

        <TabsContent value="meeting_rooms">
          <RoomBookingPanel />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesPanel />
        </TabsContent>

        <TabsContent value="my_documents">
          <MyDocumentsPanel />
        </TabsContent>

        <TabsContent value="my_tada">
          <TADAClaimsPanel mode="employee" />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysPanel />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsPanel />
        </TabsContent>
      </Tabs>

      {/* ==================== QUICK CHECK-IN MODAL ==================== */}
      <Dialog open={checkInModalOpen} onOpenChange={setCheckInModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Check In Visitor
            </DialogTitle>
            <DialogDescription>
              Record the visitor's details, purpose of visit, and host employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitor-name">Visitor Full Name *</Label>
                <Input
                  id="visitor-name"
                  placeholder="e.g. Rahul Sharma"
                  value={visitorFormData.name}
                  onChange={e => setVisitorFormData({ ...visitorFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visitor-company">Company / Organization</Label>
                <Input
                  id="visitor-company"
                  placeholder="e.g. Eduwing Global / Self"
                  value={visitorFormData.company}
                  onChange={e => setVisitorFormData({ ...visitorFormData, company: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visitor-phone">Phone Number</Label>
                <Input
                  id="visitor-phone"
                  placeholder="e.g. 9876543210"
                  value={visitorFormData.phone}
                  onChange={e => setVisitorFormData({ ...visitorFormData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visitor-email">Email Address</Label>
                <Input
                  id="visitor-email"
                  type="email"
                  placeholder="e.g. visitor@gmail.com"
                  value={visitorFormData.email}
                  onChange={e => setVisitorFormData({ ...visitorFormData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Purpose of Visit *</Label>
                <Select
                  value={visitorFormData.purpose}
                  onValueChange={val => setVisitorFormData({ ...visitorFormData, purpose: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_PURPOSES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visitorFormData.purpose === 'Other' ? (
                <div className="space-y-1.5">
                  <Label>Specify Purpose *</Label>
                  <Input
                    placeholder="Enter visit purpose"
                    value={visitorFormData.customPurpose}
                    onChange={e => setVisitorFormData({ ...visitorFormData, customPurpose: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Check-In Time</Label>
                  <Input
                    placeholder="10:30 AM"
                    value={visitorFormData.checkInTime}
                    onChange={e => setVisitorFormData({ ...visitorFormData, checkInTime: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Host Selection */}
            <div className="space-y-1.5">
              <Label>Meeting With (Host Employee / Staff) *</Label>
              <Input
                placeholder="Type to filter employees by name, dept or role..."
                value={hostSearch}
                onChange={e => setHostSearch(e.target.value)}
                className="mb-1.5 text-xs h-8"
              />
              <Select
                value={visitorFormData.hostUserId}
                onValueChange={val => setVisitorFormData({ ...visitorFormData, hostUserId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select host employee" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredHosts.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">No matching staff found</div>
                  ) : (
                    filteredHosts.map(h => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} {h.designation ? `(${h.designation})` : ''} {h.department?.name ? `• ${h.department.name}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pass / Badge Number (Optional)</Label>
                <Input
                  placeholder="e.g. PASS-014"
                  value={visitorFormData.passNumber}
                  onChange={e => setVisitorFormData({ ...visitorFormData, passNumber: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Remarks / Belongings (Optional)</Label>
                <Input
                  placeholder="e.g. Carrying laptop, badge issued"
                  value={visitorFormData.remarks}
                  onChange={e => setVisitorFormData({ ...visitorFormData, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateVisitor} disabled={submittingVisitor}>
              {submittingVisitor ? 'Checking In...' : 'Check In Visitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== QUICK BOOK ROOM MODAL ==================== */}
      <Dialog open={bookRoomModalOpen} onOpenChange={setBookRoomModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Book Meeting Room
            </DialogTitle>
            <DialogDescription>
              Select a room and host user. Confirmed bookings will reflect on the booked user's portal.
            </DialogDescription>
          </DialogHeader>

          {conflictError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{conflictError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Meeting Room *</Label>
              <Select
                value={bookingFormData.roomId}
                onValueChange={val => setBookingFormData({ ...bookingFormData, roomId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a conference room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.floor ? `(${r.floor})` : ''} • Capacity: {r.capacity} seats
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reserved For / Host User *</Label>
              <Input
                placeholder="Search staff by name or dept..."
                value={hostSearch}
                onChange={e => setHostSearch(e.target.value)}
                className="mb-1.5 text-xs h-8"
              />
              <Select
                value={bookingFormData.userId}
                onValueChange={val => setBookingFormData({ ...bookingFormData, userId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee / organizer" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredHosts.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} {h.designation ? `(${h.designation})` : ''} {h.department?.name ? `• ${h.department.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Meeting Title / Purpose *</Label>
              <Input
                placeholder="e.g. Q3 Sales Strategy Review / Candidate Interview"
                value={bookingFormData.title}
                onChange={e => setBookingFormData({ ...bookingFormData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={bookingFormData.date}
                  onChange={e => setBookingFormData({ ...bookingFormData, date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Start Time *</Label>
                <Select
                  value={bookingFormData.startTime}
                  onValueChange={val => setBookingFormData({ ...bookingFormData, startTime: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_TIMES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>End Time *</Label>
                <Select
                  value={bookingFormData.endTime}
                  onValueChange={val => setBookingFormData({ ...bookingFormData, endTime: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_TIMES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estimated Attendees</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={bookingFormData.attendeesCount}
                  onChange={e => setBookingFormData({ ...bookingFormData, attendeesCount: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description / Special Setup (Optional)</Label>
                <Input
                  placeholder="e.g. Projector needed, guest tea"
                  value={bookingFormData.description}
                  onChange={e => setBookingFormData({ ...bookingFormData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookRoomModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={submittingBooking}>
              {submittingBooking ? 'Booking Room...' : 'Confirm Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
