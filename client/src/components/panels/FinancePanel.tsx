import { useState, useEffect } from 'react';
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
  DollarSign,
  Receipt,
  Wallet,
  Plus,
  Download,
  AlertTriangle,
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
import api from '@/lib/api';
import { toast } from 'sonner';

interface FinancePanelProps {
  activeModule: string;
}

const revenueData = [
  { month: 'Jan', revenue: 450000, expenses: 320000 },
  { month: 'Feb', revenue: 520000, expenses: 350000 },
  { month: 'Mar', revenue: 480000, expenses: 340000 },
  { month: 'Apr', revenue: 649000, expenses: 380000 },
  { month: 'May', revenue: 580000, expenses: 360000 },
  { month: 'Jun', revenue: 720000, expenses: 420000 },
];

const paymentMethodData = [
  { name: 'Bank Transfer', value: 45, color: '#3b82f6' },
  { name: 'UPI', value: 30, color: '#10b981' },
  { name: 'Cash', value: 15, color: '#f59e0b' },
  { name: 'Cheque', value: 10, color: '#8b5cf6' },
];

export function FinancePanel({ activeModule }: FinancePanelProps) {
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [targetList, setTargetList] = useState<any[]>([]);
  const [studyCenters, setStudyCenters] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [admissionSessions, setAdmissionSessions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        invRes,
        payRes,
        expRes,
        centerRes,
        studentRes,
        targetsRes,
        sessionsRes,
      ] = await Promise.all([
        api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/finance/invoices').catch(() => ({ data: { data: [] } })),
        api.get('/finance/payments').catch(() => ({ data: { data: [] } })),
        api.get('/finance/expenses').catch(() => ({ data: { data: [] } })),
        api.get('/operations/centers').catch(() => ({ data: { data: [] } })),
        api.get('/student').catch(() => ({ data: { data: [] } })),
        api.get('/finance/targets').catch(() => ({ data: { data: [] } })),
        api.get('/operations/sessions').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setInvoiceList(invRes.data.data || []);
      setPaymentList(payRes.data.data || []);
      setExpenseList(expRes.data.data || []);
      setStudyCenters(centerRes.data.data || []);
      setStudents(studentRes.data.data || []);
      setTargetList(targetsRes.data.data || []);
      setAdmissionSessions(sessionsRes.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch finance data');
    } finally {
      setLoading(false);
    }
  };

  const pendingInvoices = invoiceList.filter(i => i.status === 'sent' || i.status === 'pending');
  const overdueInvoices = invoiceList.filter(i => i.status === 'overdue');
  const pendingExpenses = expenseList.filter(e => e.status === 'pending');

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No', render: (row: any) => row.invoiceNo || row.id.substring(0, 8) },
    { key: 'centerId', header: 'Center', render: () => 'Delhi Center' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: any) => `₹${(row.amount || row.total || 0).toLocaleString()}`
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (row: any) => `₹${(row.total || 0).toLocaleString()}`
    },
    { key: 'status', header: 'Status' },
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'
    },
  ];

  const paymentColumns = [
    { key: 'referenceNo', header: 'Reference No', render: (row: any) => row.referenceNo || row.id.substring(0, 8) },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: any) => `₹${(row.amount || 0).toLocaleString()}`
    },
    { 
      key: 'method', 
      header: 'Method',
      render: (row: any) => (
        <Badge variant="outline" className="capitalize">{(row.method || 'Unknown').replace('_', ' ')}</Badge>
      )
    },
    { key: 'receivedBy', header: 'Received By', render: () => 'Accountant' },
    { 
      key: 'receivedAt', 
      header: 'Date',
      render: (row: any) => row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : 'N/A'
    },
  ];

  const expenseColumns = [
    { key: 'employeeId', header: 'Employee', render: (row: any) => row.employeeId || 'BDE 1' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: any) => `₹${(row.amount || 0).toLocaleString()}`
    },
    { 
      key: 'category', 
      header: 'Category',
      render: (row: any) => (
        <Badge variant="outline" className="capitalize">{row.category || 'General'}</Badge>
      )
    },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status' },
  ];

  const targetColumns = [
    { key: 'type', header: 'Type', render: (row: any) => (
      <Badge variant="outline" className="capitalize">{row.type}</Badge>
    )},
    { key: 'period', header: 'Period' },
    { key: 'target', header: 'Target', render: (row: any) => (row.target || 0).toLocaleString() },
    { key: 'achieved', header: 'Achieved', render: (row: any) => (row.achieved || 0).toLocaleString() },
    { 
      key: 'progress', 
      header: 'Progress',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${(row.achieved || 0) >= (row.target || 1) ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(((row.achieved || 0) / (row.target || 1)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm">{Math.round(((row.achieved || 0) / (row.target || 1)) * 100)}%</span>
        </div>
      )
    },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading finance data...</div>;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Revenue"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="Collected"
        />
        <MetricCard
          title="Pending Invoices"
          value={metrics.pendingInvoices || 0}
          icon={Receipt}
          badge={{ label: `${pendingInvoices.length} invoices`, variant: 'secondary' }}
        />
        <MetricCard
          title="Total Payments"
          value={metrics.totalPayments || 0}
          icon={AlertTriangle}
          badge={{ label: 'Recorded', variant: 'default' }}
        />
        <MetricCard
          title="Pending Expenses"
          value={metrics.pendingExpenses || 0}
          icon={Wallet}
          badge={{ label: `${pendingExpenses.length} claims`, variant: 'secondary' }}
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Invoices</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingInvoices.slice(0, 5)}
              columns={invoiceColumns.slice(0, 5)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Expense Claims</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingExpenses.slice(0, 5)}
              columns={expenseColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Center</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {studyCenters.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="Enter amount" />
                </div>
                <Button className="w-full">Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({invoiceList.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({invoiceList.filter(i => i.status === 'paid').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvoices.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={invoiceList}
            columns={invoiceColumns}
            title="All Invoices"
            searchFields={['invoiceNo']}
          />
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <DataTable
            data={invoiceList.filter(i => i.status === 'paid')}
            columns={invoiceColumns}
            title="Paid Invoices"
            searchFields={['invoiceNo']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingInvoices}
            columns={invoiceColumns}
            title="Pending Invoices"
            searchFields={['invoiceNo']}
            actions={(row) => []}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <DataTable
            data={overdueInvoices}
            columns={invoiceColumns}
            title="Overdue Invoices"
            searchFields={['invoiceNo']}
            actions={(row) => []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payments</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>Refresh</Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <DataTable
        data={paymentList}
        columns={paymentColumns}
        title="Payment Entries"
        searchFields={['referenceNo']}
      />
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Claims</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>Refresh</Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingExpenses}
            columns={expenseColumns}
            title="Pending Claims"
            searchFields={['description']}
            actions={(row) => []}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <DataTable
            data={expenseList.filter(e => e.status === 'approved' || e.status === 'reimbursed')}
            columns={expenseColumns}
            title="Approved Claims"
            searchFields={['description']}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={expenseList}
            columns={expenseColumns}
            title="All Claims"
            searchFields={['description']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderTargets = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Targets</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Set Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Set Target</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="centers">Centers</SelectItem>
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
        searchFields={['period', 'type']}
      />
    </div>
  );

  const renderApprovals = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pending Approvals</h2>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>
      
      <Tabs defaultValue="centers">
        <TabsList>
          <TabsTrigger value="centers">Centers ({studyCenters.filter(c => c.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="students">Students ({students.filter(s => s.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({admissionSessions.filter(s => s.status === 'pending').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="centers" className="mt-4">
          <DataTable
            data={studyCenters.filter(c => c.status === 'pending')}
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Center Name' },
              { key: 'contact', header: 'Contact' },
              { key: 'email', header: 'Email' },
            ]}
            title="Pending Center Approvals"
            searchFields={['name', 'code']}
            actions={(row) => []}
          />
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <DataTable
            data={students.filter(s => s.status === 'pending')}
            columns={[
              { key: 'enrollmentNo', header: 'Enrollment No' },
              { key: 'name', header: 'Student Name' },
              { key: 'email', header: 'Email' },
              { key: 'phone', header: 'Phone' },
            ]}
            title="Pending Student Approvals"
            searchFields={['name', 'enrollmentNo']}
            actions={(row) => []}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <DataTable
            data={admissionSessions.filter(s => s.status === 'pending')}
            columns={[
              { key: 'name', header: 'Session Name' },
              { key: 'startDate', header: 'Start Date', render: (row: any) => row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A' },
              { key: 'endDate', header: 'End Date', render: (row: any) => row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A' },
            ]}
            title="Pending Session Approvals"
            searchFields={['name']}
            actions={(row) => []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'finance':
      return renderDashboard();
    case 'invoices':
      return renderInvoices();
    case 'payments':
      return renderPayments();
    case 'expenses':
      return renderExpenses();
    case 'targets':
      return renderTargets();
    case 'approvals':
      return renderApprovals();
    default:
      return renderDashboard();
  }
}
