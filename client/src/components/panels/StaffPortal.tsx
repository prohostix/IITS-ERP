import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { announcements, holidays } from '@/data/mockData';

interface StaffPortalProps {
  activeModule: string;
}

export function StaffPortal({ activeModule }: StaffPortalProps) {
  const renderHolidays = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Holidays Calendar</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.map((holiday) => (
          <Card key={holiday.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="min-w-[60px] p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {holiday.date.getDate()}
                  </p>
                  <p className="text-xs text-slate-600">
                    {holiday.date.toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{holiday.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{holiday.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">{holiday.type}</Badge>
                  </div>
                  {holiday.description && (
                    <p className="text-sm text-slate-600 mt-2">{holiday.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {holidays.filter(h => h.date > new Date()).slice(0, 5).map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-slate-500">
                      {holiday.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{holiday.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Announcements</h2>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
          <TabsTrigger value="important">Important</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className={ann.priority === 'high' ? 'border-orange-200' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ann.priority === 'high' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    <Bell className={`w-6 h-6 ${
                      ann.priority === 'high' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">{ann.type}</Badge>
                      {ann.priority === 'high' && (
                        <Badge className="bg-orange-100 text-orange-800">Important</Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {ann.postedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{ann.title}</h3>
                    <p className="text-slate-600 mt-2">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-4">
                      <span className="text-sm text-slate-500">Posted by: Admin</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="general" className="mt-4 space-y-4">
          {announcements.filter(a => a.type === 'general').map((ann) => (
            <Card key={ann.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">General</Badge>
                      <span className="text-xs text-slate-500">
                        {ann.postedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{ann.title}</h3>
                    <p className="text-slate-600 mt-2">{ann.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hr" className="mt-4 space-y-4">
          {announcements.filter(a => a.type === 'hr').map((ann) => (
            <Card key={ann.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">HR</Badge>
                      <span className="text-xs text-slate-500">
                        {ann.postedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{ann.title}</h3>
                    <p className="text-slate-600 mt-2">{ann.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="important" className="mt-4 space-y-4">
          {announcements.filter(a => a.priority === 'high').map((ann) => (
            <Card key={ann.id} className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">{ann.type}</Badge>
                      <Badge className="bg-orange-100 text-orange-800">Important</Badge>
                      <span className="text-xs text-slate-500">
                        {ann.postedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{ann.title}</h3>
                    <p className="text-slate-600 mt-2">{ann.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Announcements
            </CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize">{ann.type}</Badge>
                    {ann.priority === 'high' && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">Important</Badge>
                    )}
                  </div>
                  <p className="font-medium">{ann.title}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ann.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {ann.postedAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Holidays
            </CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {holidays.slice(0, 4).map((holiday) => (
                <div key={holiday.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="min-w-[50px] p-2 bg-blue-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {holiday.date.getDate()}
                    </p>
                    <p className="text-xs text-slate-600">
                      {holiday.date.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-slate-500">
                      {holiday.date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{holiday.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Apply Leave', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
              { label: 'View Payslip', icon: FileText, color: 'bg-green-100 text-green-600' },
              { label: 'Mark Attendance', icon: CheckCircle, color: 'bg-purple-100 text-purple-600' },
              { label: 'Raise Complaint', icon: AlertTriangle, color: 'bg-orange-100 text-orange-600' },
            ].map((link) => (
              <Button
                key={link.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-sm">{link.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'staff':
      return renderDashboard();
    case 'holidays':
      return renderHolidays();
    case 'announcements':
      return renderAnnouncements();
    default:
      return renderDashboard();
  }
}
