import { useState } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/dashboard/MetricCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  TrendingUp,
  CheckSquare,
  Plus,
  UserPlus,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { leads, targets, employees, studyCenters } from '@/data/mockData';
import type { Lead, Target as TargetType } from '@/types/erp';

interface SalesPanelProps {
  activeModule: string;
}

const leadData = [
  { month: 'Jan', new: 15, converted: 3, lost: 2 },
  { month: 'Feb', new: 18, converted: 4, lost: 3 },
  { month: 'Mar', new: 12, converted: 2, lost: 2 },
  { month: 'Apr', new: 22, converted: 5, lost: 4 },
  { month: 'May', new: 16, converted: 4, lost: 3 },
  { month: 'Jun', new: 25, converted: 6, lost: 5 },
];

const leadSourceData = [
  { name: 'Referral', value: 35, color: '#3b82f6' },
  { name: 'Website', value: 25, color: '#10b981' },
  { name: 'Email Campaign', value: 20, color: '#f59e0b' },
  { name: 'Social Media', value: 15, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#6b7280' },
];

const pipelineStages = [
  { name: 'New', count: 15, value: 0 },
  { name: 'Contacted', count: 12, value: 0 },
  { name: 'Qualified', count: 8, value: 250000 },
  { name: 'Proposal', count: 5, value: 450000 },
  { name: 'Negotiation', count: 3, value: 320000 },
  { name: 'Converted', count: 12, value: 1200000 },
];

export function SalesPanel({ activeModule }: SalesPanelProps) {
  const [leadList] = useState<Lead[]>(leads);
  const [targetList] = useState<TargetType[]>(targets.filter(t => t.employeeId || t.type === 'centers'));

  const totalLeads = leadList.length;
  const convertedLeads = leadList.filter(l => l.status === 'converted').length;
  const newLeads = leadList.filter(l => l.status === 'new').length;
  const conversionRate = Math.round((convertedLeads / totalLeads) * 100);

  const leadColumns = [
    { key: 'centerName', header: 'Center Name' },
    { key: 'contactName', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: Lead) => (
        <Badge className={
          row.status === 'converted' ? 'bg-green-100 text-green-800' :
          row.status === 'new' ? 'bg-blue-100 text-blue-800' :
          row.status === 'lost' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }>
          {row.status}
        </Badge>
      )
    },
    { 
      key: 'source', 
      header: 'Source',
      render: (row: Lead) => (
        <Badge variant="outline" className="capitalize">{row.source.replace('_', ' ')}</Badge>
      )
    },
  ];

  const targetColumns = [
    { key: 'employeeId', header: 'Employee', render: (row: TargetType) => row.employeeId ? 'BDE' : 'Center' },
    { key: 'type', header: 'Type', render: (row: TargetType) => (
      <Badge variant="outline" className="capitalize">{row.type}</Badge>
    )},
    { key: 'period', header: 'Period' },
    { key: 'target', header: 'Target', render: (row: TargetType) => row.target.toLocaleString() },
    { key: 'achieved', header: 'Achieved', render: (row: TargetType) => row.achieved.toLocaleString() },
    { 
      key: 'progress', 
      header: 'Progress',
      render: (row: TargetType) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${row.achieved >= row.target ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min((row.achieved / row.target) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm">{Math.round((row.achieved / row.target) * 100)}%</span>
        </div>
      )
    },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Leads"
          value={totalLeads}
          icon={Users}
          trend="up"
          trendValue="+5 this month"
        />
        <MetricCard
          title="Converted"
          value={convertedLeads}
          icon={CheckSquare}
          description={`${conversionRate}% conversion rate`}
        />
        <MetricCard
          title="New Leads"
          value={newLeads}
          icon={UserPlus}
          badge={{ label: 'Action Needed', variant: 'secondary' }}
        />
        <MetricCard
          title="Pipeline Value"
          value="₹12.5L"
          icon={TrendingUp}
          trend="up"
          trendValue="+15% this month"
        />
      </MetricCardGrid>

      {/* Sales Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {pipelineStages.map((stage, index) => (
              <div key={stage.name} className="flex items-center">
                <div className="text-center">
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-white font-bold
                    ${index === 5 ? 'bg-green-500' : index === 0 ? 'bg-blue-500' : 'bg-slate-400'}
                  `}>
                    {stage.count}
                  </div>
                  <p className="text-xs mt-2 font-medium">{stage.name}</p>
                  {stage.value > 0 && (
                    <p className="text-xs text-slate-500">₹{(stage.value / 100000).toFixed(1)}L</p>
                  )}
                </div>
                {index < pipelineStages.length - 1 && (
                  <div className="w-12 h-0.5 bg-slate-200 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new" fill="#3b82f6" name="New Leads" />
                <Bar dataKey="converted" fill="#10b981" name="Converted" />
                <Bar dataKey="lost" fill="#ef4444" name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Leads</CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={leadList.slice(0, 5)}
            columns={leadColumns.slice(0, 5)}
            searchable={false}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Center Name</Label>
                  <Input placeholder="Enter center name" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input placeholder="Enter contact name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="Enter phone number" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input placeholder="Enter address" />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="email_campaign">Email Campaign</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Add Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({leadList.length})</TabsTrigger>
          <TabsTrigger value="new">New ({leadList.filter(l => l.status === 'new').length})</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="converted">Converted ({convertedLeads})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={leadList}
            columns={leadColumns}
            title="All Leads"
            searchFields={['centerName', 'contactName', 'email']}
            actions={(row) => [
              { label: 'View', onClick: () => console.log('View', row.id) },
              { label: 'Edit', onClick: () => console.log('Edit', row.id) },
              row.status === 'new' && { label: 'Contact', onClick: () => console.log('Contact', row.id) },
            ].filter(Boolean) as any}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <DataTable
            data={leadList.filter(l => l.status === 'new')}
            columns={leadColumns}
            title="New Leads"
            searchFields={['centerName', 'contactName']}
            actions={(row) => [
              { label: 'Contact', onClick: () => console.log('Contact', row.id) },
              { label: 'Qualify', onClick: () => console.log('Qualify', row.id) },
            ]}
          />
        </TabsContent>

        <TabsContent value="contacted" className="mt-4">
          <DataTable
            data={leadList.filter(l => l.status === 'contacted')}
            columns={leadColumns}
            title="Contacted Leads"
            searchFields={['centerName', 'contactName']}
          />
        </TabsContent>

        <TabsContent value="converted" className="mt-4">
          <DataTable
            data={leadList.filter(l => l.status === 'converted')}
            columns={leadColumns}
            title="Converted Leads"
            searchFields={['centerName', 'contactName']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderReferrals = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Referrals</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {employees.filter(e => e.role === 'employee' && e.departmentId === 'dept-sales-001').map(emp => (
          <Card key={emp.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{emp.name}</p>
                  <p className="text-sm text-slate-500">{emp.designation}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{leads.filter(l => l.referredBy === emp.id).length}</p>
                  <p className="text-xs text-slate-500">Referrals</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {leads.filter(l => l.referredBy === emp.id && l.status === 'converted').length}
                  </p>
                  <p className="text-xs text-slate-500">Converted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referred Centers</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={studyCenters.filter(c => c.referredBy)}
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Center Name' },
              { key: 'status', header: 'Status' },
              { key: 'referredBy', header: 'Referred By', render: () => 'BDE' },
              { key: 'approvedAt', header: 'Approved Date', render: (row) => row.approvedAt?.toLocaleDateString() || '-' },
            ]}
            title=""
            searchFields={['name', 'code']}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderTargets = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Targets</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Set Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Set Sales Target</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.departmentId === 'dept-sales-001').map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centers">Centers</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Input placeholder="e.g., Q2-2024" />
              </div>
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input type="number" placeholder="Enter target" />
              </div>
              <Button className="w-full">Set Target</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={targetList}
        columns={targetColumns}
        title="All Targets"
        searchFields={['period']}
      />
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'sales':
      return renderDashboard();
    case 'leads':
      return renderLeads();
    case 'referrals':
      return renderReferrals();
    case 'targets':
      return renderTargets();
    default:
      return renderDashboard();
  }
}
