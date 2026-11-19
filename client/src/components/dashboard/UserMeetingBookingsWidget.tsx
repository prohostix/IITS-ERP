import { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface RoomBooking {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount?: number;
  status: string;
  room?: {
    id: string;
    name: string;
    code?: string;
    floor?: string;
    capacity: number;
  };
  bookedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export function UserMeetingBookingsWidget() {
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const res = await api.get('/front-office/my-bookings');
      setBookings(res.data.data || []);
    } catch {
      // Non-fatal if front office feature is not enabled or network blip
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date && b.date.startsWith(todayStr));

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="h-20 bg-muted/60 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm bg-card/60 backdrop-blur-xl">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            My Meeting Room Bookings
          </CardTitle>
          <CardDescription className="text-xs">
            Conference and meeting rooms reserved for you by Front Desk.
          </CardDescription>
        </div>
        {todayBookings.length > 0 && (
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
            {todayBookings.length} Meeting{todayBookings.length > 1 ? 's' : ''} Today
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {bookings.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
            <p className="text-xs font-medium">No upcoming room bookings</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              When Front Office reserves a room for your meetings, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map(booking => {
              const isToday = booking.date && booking.date.startsWith(todayStr);
              const dateFormatted = booking.date 
                ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                : '—';

              return (
                <div
                  key={booking.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isToday 
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40' 
                      : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {booking.room?.name || 'Meeting Room'}
                        </span>
                        {booking.room?.code && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                            {booking.room.code}
                          </Badge>
                        )}
                        {isToday ? (
                          <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 font-semibold">
                            Today
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {dateFormatted}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-foreground">
                        {booking.title}
                      </p>

                      {booking.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {booking.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <div className="text-xs font-bold text-primary flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {booking.startTime} – {booking.endTime}
                      </div>
                      {booking.room?.floor && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 justify-end">
                          <MapPin className="w-2.5 h-2.5" /> {booking.room.floor}
                        </p>
                      )}
                    </div>
                  </div>

                  {booking.bookedBy && (
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 mt-2 border-t border-border/40">
                      <span>Booked by: <span className="font-medium text-foreground">{booking.bookedBy.name}</span> ({booking.bookedBy.role.replace(/_/g, ' ')})</span>
                      {booking.attendeesCount && (
                        <span className="flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {booking.attendeesCount} Persons
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

