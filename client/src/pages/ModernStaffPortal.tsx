import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ClipboardList, 
  MessageSquare, 
  HelpCircle, 
  FileText, 
  Navigation, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
export function ModernStaffPortal() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStaffMetrics();
  }, []);

  const fetchStaffMetrics = async () => {
    setLoading(true);
    try {
      await api.get('/dashboard/metrics');
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="h-64 bg-muted rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Staff Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Staff Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Access essential tools, documents, and support services.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="glass">
            <HelpCircle className="w-4 h-4 mr-2" />
            Support Desk
          </Button>
          <Button variant="premium" size="sm">
            <ClipboardList className="w-4 h-4 mr-2" />
            Duty Roster
          </Button>
        </div>
      </div>

      {/* Staff Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StaffMetric 
          title="Daily Schedule" 
          value="09:00 - 18:00" 
          icon={<Clock className="w-5 h-5" />}
          subtext="General Shift"
          color="primary"
        />
        <StaffMetric 
          title="Announcements" 
          value="3 New" 
          icon={<Bell className="w-5 h-5" />}
          subtext="Check Notice Board"
          color="warning"
        />
        <StaffMetric 
          title="Leave Balance" 
          value="12 Days" 
          icon={<Calendar className="w-5 h-5" />}
          subtext="Available this year"
          color="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Notice Board */}
        <Card className="lg:col-span-3 border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Internal Announcements</CardTitle>
              <CardDescription>Latest updates from HR & Management</CardDescription>
            </div>
            <Button variant="ghost" size="sm">Archive</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <NoticeItem 
              title="New Health Insurance Policy 2026"
              date="Published 2 Days ago"
              excerpt="We are excited to announce an enhanced health insurance package for all staff members starting April..."
              tag="HR"
            />
            <NoticeItem 
              title="Annual Institutional Awards Night"
              date="Published Today"
              excerpt="Join us for a night of celebration at the Grand Hall on March 25th. All staff members are invited..."
              tag="Event"
            />
            <NoticeItem 
              title="System Maintenance: March 20th"
              date="Published 5h ago"
              excerpt="The ERP system will be down for scheduled maintenance on Sunday, March 20th, from 02:00 to 06:00..."
              tag="System"
            />
          </CardContent>
        </Card>

        {/* Quick Utilities */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <UtilityLink title="Staff Handbook" />
              <UtilityLink title="Brand Guidelines" />
              <UtilityLink title="IT Guidelines" />
              <UtilityLink title="Safety Manual" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Internal Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">HR</Badge>
                  <span className="font-bold">+1 (555) 001-234</span>
               </div>
               <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">IT</Badge>
                  <span className="font-bold">+1 (555) 001-567</span>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Punch Widget */}
{/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <PortalBtn icon={<FileText className="w-5 h-5 text-primary" />} title="Request Form" />
          <PortalBtn icon={<Navigation className="w-5 h-5 text-info" />} title="Expenses" />
          <PortalBtn icon={<MessageSquare className="w-5 h-5 text-success" />} title="Messenger" />
          <PortalBtn icon={<HelpCircle className="w-5 h-5 text-warning" />} title="FAQ" />
        </div>
      </div>
    </div>
  );
}

function StaffMetric({ title, value, icon, subtext, color }: any) {
  const colorMap: any = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  return (
    <Card className="hover:shadow-md transition-all duration-300 border-none bg-card/40 backdrop-blur-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl", colorMap[color])}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoticeItem({ title, date, excerpt, tag }: any) {
  return (
    <div className="p-4 rounded-xl border border-border bg-background/30 hover:bg-background/80 transition-all cursor-pointer group">
       <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-[9px] font-bold uppercase">{tag}</Badge>
          <span className="text-[10px] text-muted-foreground font-medium">{date}</span>
       </div>
       <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</h4>
       <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{excerpt}</p>
       <div className="mt-4 flex items-center text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          READ MORE <ExternalLink className="w-3 h-3 ml-1" />
       </div>
    </div>
  );
}

function UtilityLink({ title }: any) {
  return (
    <button className="w-full text-left p-2 rounded-lg hover:bg-primary/10 hover:text-primary text-xs font-medium flex items-center justify-between group">
       {title}
       <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
    </button>
  );
}

function PortalBtn({ icon, title }: any) {
  return (
    <button className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
       <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all mb-3 group-hover:scale-110 shadow-xs">
         {icon}
       </div>
       <span className="text-xs font-bold text-foreground">{title}</span>
    </button>
  );
}

function Bell(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

