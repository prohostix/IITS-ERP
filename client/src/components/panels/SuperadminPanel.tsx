import { useState, useEffect } from 'react';
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
import api from '@/lib/api';
import { toast } from 'sonner';

interface SuperadminPanelProps {
  activeModule: string;
}

export function SuperadminPanel({ activeModule }: SuperadminPanelProps) {
  const [metrics, setMetrics] = useState<any>({});
  const [orgList, setOrgList] = useState<any[]>([]);
  const [licenseList, setLicenseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, orgRes, licenseRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/org'),
        api.get('/licenses').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setOrgList(orgRes.data.data || []);
      setLicenseList(licenseRes.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch superadmin data');
    } finally {
      setLoading(false);
    }
  };

  const organizationColumns = [
    { key: 'name', header: 'Organization Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { 
      key: 'licenseExpiry', 
      header: 'License Expiry',
      render: (row: any) => row.licenseExpiry ? new Date(row.licenseExpiry).toLocaleDateString() : '-'
    },
  ];

  const licenseColumns = [
    { key: 'name', header: 'License Name' },
    { key: 'type', header: 'Type', render: (row: any) => (
      <Badge variant="outline" className="capitalize">{row.type}</Badge>
    )},
    { key: 'maxUsers', header: 'Max Users' },
    { key: 'maxStorage', header: 'Storage (GB)' },
    { key: 'price', header: 'Price', render: (row: any) => `₹${row.price.toLocaleString()}` },
    { key: 'status', header: 'Status' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading superadmin data...</div>;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Organizations"
          value={orgList.length}
          icon={Building2}
          trend="up"
          trendValue="Active"
        />
        <MetricCard
          title="Active Licenses"
          value={licenseList.filter(l => l.status === 'active').length || 0}
          icon={Key}
          trend="up"
          trendValue="Assigned"
        />
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers || 0}
          icon={Users}
          trend="up"
          trendValue="Global"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="Total Platform"
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
                    <p className="text-sm text-slate-500">{license.features?.length || 0} features</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{license.price?.toLocaleString() || 0}</p>
                    <p className="text-sm text-slate-500">{license.durationMonths || 12} months</p>
                  </div>
                </div>
              ))}
              {licenseList.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No licenses found</div>
              )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input type="number" placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Storage (GB)</Label>
                  <Input type="number" placeholder="100" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
