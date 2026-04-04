import { useState } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/dashboard/MetricCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  Key,
  Users,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { organizations, licenses, getDashboardMetrics } from '@/data/mockData';
import type { Organization, License } from '@/types/erp';

interface SuperadminPanelProps {
  activeModule: string;
}

export function SuperadminPanel({ activeModule }: SuperadminPanelProps) {
  const metrics = getDashboardMetrics('superadmin');
  const [orgList] = useState<Organization[]>(organizations);
  const [licenseList] = useState<License[]>(licenses);

  const organizationColumns = [
    { key: 'name', header: 'Organization Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { 
      key: 'licenseExpiry', 
      header: 'License Expiry',
      render: (row: Organization) => row.licenseExpiry?.toLocaleDateString() || '-'
    },
  ];

  const licenseColumns = [
    { key: 'name', header: 'License Name' },
    { key: 'type', header: 'Type', render: (row: License) => (
      <Badge variant="outline" className="capitalize">{row.type}</Badge>
    )},
    { key: 'maxUsers', header: 'Max Users' },
    { key: 'maxStorage', header: 'Storage (GB)' },
    { key: 'price', header: 'Price', render: (row: License) => `₹${row.price.toLocaleString()}` },
    { key: 'status', header: 'Status' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Organizations"
          value={metrics.totalOrganizations || 0}
          icon={Building2}
          trend="up"
          trendValue="+2 this month"
        />
        <MetricCard
          title="Active Licenses"
          value={metrics.activeLicenses || 0}
          icon={Key}
          trend="up"
          trendValue="+1 this month"
        />
        <MetricCard
          title="Total Users"
          value="156"
          icon={Users}
          trend="up"
          trendValue="+12 this month"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+15% this quarter"
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={orgList.slice(0, 5)}
              columns={organizationColumns}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">License Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {licenseList.map((license) => (
                <div key={license.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{license.name}</p>
                    <p className="text-sm text-slate-500">{license.features.length} features</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{license.price.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{license.durationMonths} months</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderOrganizations = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organizations</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input placeholder="Enter organization name" />
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
                <Label>License</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select license" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseList.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Create Organization</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={orgList}
        columns={organizationColumns}
        title="All Organizations"
        searchFields={['name', 'email', 'phone']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          { label: 'Edit', onClick: () => console.log('Edit', row.id) },
          { label: 'Delete', onClick: () => console.log('Delete', row.id), variant: 'destructive' },
        ]}
      />
    </div>
  );

  const renderLicenses = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Licenses</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create License
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New License</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>License Name</Label>
                <Input placeholder="Enter license name" />
              </div>
              <div className="space-y-2">
                <Label>License Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input type="number" placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Storage (GB)</Label>
                  <Input type="number" placeholder="100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (Months)</Label>
                  <Input type="number" placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" placeholder="49999" />
                </div>
              </div>
              <Button className="w-full">Create License</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={licenseList}
        columns={licenseColumns}
        title="All Licenses"
        searchFields={['name', 'type']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          { label: 'Edit', onClick: () => console.log('Edit', row.id) },
          { label: 'Delete', onClick: () => console.log('Delete', row.id), variant: 'destructive' },
        ]}
      />
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
      return renderDashboard();
    case 'org-list':
    case 'organizations':
      return renderOrganizations();
    case 'licenses':
      return renderLicenses();
    default:
      return renderDashboard();
  }
}
