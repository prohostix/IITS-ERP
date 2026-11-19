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
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { VisitorManagementPanel } from '@/components/panels/VisitorManagementPanel';
import { RoomBookingPanel } from '@/components/panels/RoomBookingPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import api from '@/lib/api';

export function ModernFrontOfficeDashboard({
  initialTab,
  onNavigate,
}: {
  initialTab?: string;
  onNavigate?: (tab: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [metrics, setMetrics] = useState({
    todayVisitors: 0,
    activeVisitors: 0,
    todayBookings: 0,
    totalRooms: 0,
    activeRooms: 0,
  });

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [visitorRes, roomsRes, bookingsRes] = await Promise.all([
        api.get('/front-office/visitors', { params: { date: today } }).catch(() => ({ data: { stats: {} } })),
        api.get('/front-office/rooms').catch(() => ({ data: { data: [] } })),
        api.get('/front-office/bookings', { params: { date: today } }).catch(() => ({ data: { data: [] } })),
      ]);

      const vStats = visitorRes.data.stats || {};
      const roomsList: any[] = roomsRes.data.data || [];
      const bookingsList: any[] = bookingsRes.data.data || [];

      setMetrics({
        todayVisitors: vStats.totalToday || 0,
        activeVisitors: vStats.activeNow || 0,
        todayBookings: bookingsList.filter(b => b.status !== 'cancelled').length,
        totalRooms: roomsList.length,
        activeRooms: roomsList.filter(r => !r.isCurrentlyOccupied && r.status === 'active').length,
      });
    } catch {
      // Non-fatal
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' ? 'dashboard' : tab);
    }
  };

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
          label: 'Visitor Management',
          icon: <UserPlus className="w-4 h-4 mr-2" />,
          onClick: () => handleTabChange('visitors'),
        }}
        secondaryAction={{
          label: 'Book Meeting Room',
          icon: <Calendar className="w-4 h-4 mr-2" />,
          onClick: () => handleTabChange('meeting_rooms'),
        }}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="relative">
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden no-scrollbar h-auto py-1 gap-1 bg-transparent border-b rounded-none flex-nowrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              Overview
            </TabsTrigger>
            <TabsTrigger value="visitors" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              Visitor Logbook
            </TabsTrigger>
            <TabsTrigger value="meeting_rooms" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              Meeting Room Bookings
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              My Leaves
            </TabsTrigger>
            <TabsTrigger value="holidays" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              Holidays
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              Announcements
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Visitor Panel */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Visitor Desk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quickly check in incoming guests and log who they are meeting.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleTabChange('visitors')}>
                  View Full Log <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <VisitorManagementPanel />
              </CardContent>
            </Card>

            {/* Quick Meeting Rooms Schedule */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Meeting Rooms Schedule
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Conference room bookings reflected on host employee portals.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleTabChange('meeting_rooms')}>
                  View All Rooms <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <RoomBookingPanel />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dedicated Visitors Tab */}
        <TabsContent value="visitors">
          <VisitorManagementPanel />
        </TabsContent>

        {/* Dedicated Meeting Rooms Tab */}
        <TabsContent value="meeting_rooms">
          <RoomBookingPanel />
        </TabsContent>

        {/* Self-service Tabs */}
        <TabsContent value="attendance">
          <AttendancePanel />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesPanel />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysPanel />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
