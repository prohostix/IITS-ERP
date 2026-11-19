import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Building2, 
  Users, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  XCircle, 
  Filter, 
  ChevronRight,
  MoreVertical,
  Layers,
  Sparkles,
  MapPin,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

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

interface HostUser {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: { id: string; name: string };
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

const STANDARD_TIMES = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM',
];

export function RoomBookingPanel() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  // Booking Modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [hostSearch, setHostSearch] = useState('');

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchRooms();
    fetchHosts();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [selectedRoomFilter, statusFilter, dateFilter, customDate]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/front-office/rooms');
      setRooms(res.data.data || []);
    } catch {
      toast.error('Failed to load meeting rooms');
    }
  };

  const fetchHosts = async () => {
    try {
      const res = await api.get('/front-office/hosts');
      setHosts(res.data.data || []);
    } catch {
      // Non-fatal
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedRoomFilter !== 'all') params.roomId = selectedRoomFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      if (dateFilter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'custom' && customDate) {
        params.date = customDate;
      }

      const res = await api.get('/front-office/bookings', { params });
      setBookings(res.data.data || []);
    } catch {
      toast.error('Failed to load room bookings');
    } finally {
      setLoading(false);
    }
  };

  const openBookDialog = (preselectedRoomId?: string) => {
    setConflictError(null);
    setFormData({
      roomId: preselectedRoomId || (rooms[0]?.id || ''),
      userId: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      attendeesCount: 4,
      remarks: '',
    });
    setHostSearch('');
    setDialogOpen(true);
  };

  const handleCreateBooking = async () => {
    if (!formData.roomId) {
      toast.error('Please select a meeting room');
      return;
    }
    if (!formData.userId) {
      toast.error('Please select a user / host for the meeting');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please provide a meeting title or agenda');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      toast.error('Please specify start and end times');
      return;
    }

    setSubmitting(true);
    setConflictError(null);

    try {
      await api.post('/front-office/bookings', formData);
      toast.success('Meeting room booked successfully! Booking reflected on host user dashboard.');
      setDialogOpen(false);
      fetchBookings();
      fetchRooms(); // refresh availability counters
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to book meeting room';
      setConflictError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/front-office/bookings/${id}/status`, { status });
      toast.success(`Booking status changed to ${status}`);
      fetchBookings();
      fetchRooms();
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (id: string, title: string) => {
    if (!confirm(`Cancel and remove reservation for "${title}"?`)) return;
    try {
      await api.delete(`/front-office/bookings/${id}`);
      toast.success('Reservation cancelled successfully');
      fetchBookings();
      fetchRooms();
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  const filteredHosts = hosts.filter(h => {
    if (!hostSearch.trim()) return true;
    const q = hostSearch.toLowerCase();
    return h.name.toLowerCase().includes(q) || 
      h.role.toLowerCase().includes(q) || 
      (h.designation && h.designation.toLowerCase().includes(q)) ||
      (h.department?.name && h.department.name.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meeting Rooms & Reservations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule conference rooms, coordinate meetings for employees, and monitor live room occupancy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchRooms(); fetchBookings(); }}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => openBookDialog()} className="shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> Book Meeting Room
          </Button>
        </div>
      </div>

      {/* Meeting Rooms Live Availability Cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Available Meeting Rooms ({rooms.length})
        </h3>

        {rooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No meeting rooms added yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Meeting rooms can be configured from the Org Admin Panel.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
              const isOccupied = room.isCurrentlyOccupied;
              const isMaintenance = room.status === 'maintenance';

              return (
                <Card 
                  key={room.id} 
                  className={`border transition-all hover:shadow-md ${
                    isOccupied 
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20' 
                      : isMaintenance 
                      ? 'border-slate-300 opacity-60 bg-muted/20' 
                      : 'border-slate-200 dark:border-slate-800 bg-card'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">{room.name}</h4>
                          {room.code && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {room.code}
                            </Badge>
                          )}
                        </div>
                        {room.floor && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {room.floor}
                          </p>
                        )}
                      </div>

                      {isMaintenance ? (
                        <Badge variant="secondary" className="text-[10px]">Maintenance</Badge>
                      ) : isOccupied ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Busy Now
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Available
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" /> {room.capacity} Seats
                      </span>
                      <span>•</span>
                      <span>{room.todayBookingsCount || 0} meetings today</span>
                    </div>

                    {/* Amenities list */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map(a => (
                          <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Active Meeting or Next Meeting */}
                    {room.currentMeeting && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                        <p className="font-semibold text-amber-900 dark:text-amber-200 line-clamp-1">
                          In Progress: "{room.currentMeeting.title}"
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                          {room.currentMeeting.startTime} - {room.currentMeeting.endTime} (Host: {room.currentMeeting.user?.name || 'Staff'})
                        </p>
                      </div>
                    )}

                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant={isOccupied ? "outline" : "default"}
                        className="w-full h-8 text-xs font-medium"
                        disabled={isMaintenance}
                        onClick={() => openBookDialog(room.id)}
                      >
                        <CalendarIcon className="w-3.5 h-3.5 mr-1.5" /> Book This Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter / Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>

              <Select value={selectedRoomFilter} onValueChange={setSelectedRoomFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meeting Rooms</SelectItem>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Schedule Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="custom">Pick Date</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Schedule Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Meeting Room Bookings ({bookings.length})</span>
            <span className="text-xs font-normal text-muted-foreground">Booked schedule reflects directly on user portals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/60 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium text-base">No room bookings found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Book Meeting Room" to schedule a conference or meeting slot.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="py-3 px-4">Room & Location</th>
                    <th className="py-3 px-4">Date & Time Slot</th>
                    <th className="py-3 px-4">Meeting Agenda / Title</th>
                    <th className="py-3 px-4">Booked For (Host User)</th>
                    <th className="py-3 px-4">Attendees</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map(booking => {
                    const bookingDateStr = booking.date 
                      ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                      : '—';

                    return (
                      <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            {booking.room?.name || 'Meeting Room'}
                          </div>
                          {booking.room?.floor && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {booking.room.floor}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <div className="font-medium text-foreground">{bookingDateStr}</div>
                          <div className="text-primary font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {booking.startTime} – {booking.endTime}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground text-xs">{booking.title}</div>
                          {booking.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {booking.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {booking.user ? (
                            <div>
                              <p className="font-semibold text-foreground text-xs">{booking.user.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {booking.user.designation || booking.user.role.replace(/_/g, ' ')}
                                {booking.user.department?.name ? ` • ${booking.user.department.name}` : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> {booking.attendeesCount || 2}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {booking.status === 'confirmed' && (
                            <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-xs">
                              Confirmed
                            </Badge>
                          )}
                          {booking.status === 'in_progress' && (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs">
                              In Progress
                            </Badge>
                          )}
                          {booking.status === 'completed' && (
                            <Badge variant="secondary" className="text-xs text-muted-foreground">
                              Completed
                            </Badge>
                          )}
                          {booking.status === 'cancelled' && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                              Cancelled
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleUpdateStatus(booking.id, 'completed')}
                                title="Mark meeting completed"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> End
                              </Button>
                            )}
                            {booking.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteBooking(booking.id, booking.title)}
                                title="Cancel booking"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Room Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Book Meeting Room
            </DialogTitle>
          </DialogHeader>

          {conflictError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Booking Conflict</p>
                <p>{conflictError}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Room Select */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Select Meeting Room *</Label>
              <Select
                value={formData.roomId}
                onValueChange={val => {
                  setFormData({ ...formData, roomId: val });
                  setConflictError(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a meeting room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.filter(r => r.status === 'active').map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.code ? `(${r.code})` : ''} — {r.capacity} seats {r.floor ? `[${r.floor}]` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Book For / Host User Dropdown */}
            <div className="space-y-1.5 border p-3 rounded-lg bg-muted/20">
              <Label className="font-semibold text-xs flex items-center justify-between">
                <span>Book For Employee / Host *</span>
                <span className="text-[11px] text-muted-foreground font-normal">Will show on their dashboard</span>
              </Label>

              <Input
                placeholder="Search staff by name or role..."
                value={hostSearch}
                onChange={e => setHostSearch(e.target.value)}
                className="mb-2 h-8 text-xs"
              />

              <Select
                value={formData.userId}
                onValueChange={val => setFormData({ ...formData, userId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredHosts.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} — {h.designation || h.role.replace(/_/g, ' ')} {h.department?.name ? `(${h.department.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Title / Agenda */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Meeting Title / Agenda *</Label>
              <Input
                placeholder="e.g. Sales Pipeline Review, Candidate Interview, Client Demo"
                value={formData.title}
                onChange={e => {
                  setFormData({ ...formData, title: e.target.value });
                  setConflictError(null);
                }}
              />
            </div>

            {/* Date, Start Time, End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date of Booking *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => {
                    setFormData({ ...formData, date: e.target.value });
                    setConflictError(null);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Start Time *</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={val => {
                    setFormData({ ...formData, startTime: val });
                    setConflictError(null);
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {STANDARD_TIMES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">End Time *</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={val => {
                    setFormData({ ...formData, endTime: val });
                    setConflictError(null);
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {STANDARD_TIMES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Attendees Count & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expected Attendees</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.attendeesCount}
                  onChange={e => setFormData({ ...formData, attendeesCount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Special Requests / Equipment</Label>
                <Input
                  placeholder="e.g. Projector needed, Video call setup"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description / Meeting Notes</Label>
              <Input
                placeholder="Optional description or link..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking} disabled={submitting}>
              {submitting ? 'Confirming Booking...' : 'Confirm Room Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

