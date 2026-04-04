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
import { invoices, paymentEntries, expenseClaims, targets, studyCenters, students, admissionSessions } from '@/data/mockData';
import type { Invoice, PaymentEntry, ExpenseClaim, Target as TargetType } from '@/types/erp';

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
  const [invoiceList] = useState<Invoice[]>(invoices);
  const [paymentList] = useState<PaymentEntry[]>(paymentEntries);
  const [expenseList] = useState<ExpenseClaim[]>(expenseClaims);
  const [targetList] = useState<TargetType[]>(targets);

  const pendingInvoices = invoiceList.filter(i => i.status === 'sent');
  const overdueInvoices = invoiceList.filter(i => i.status === 'overdue');
  const pendingExpenses = expenseList.filter(e => e.status === 'pending');

  const totalRevenue = invoiceList.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.total, 0);
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'centerId', header: 'Center', render: () => 'Delhi Center' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: Invoice) => `₹${row.amount.toLocaleString()}`
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (row: Invoice) => `₹${row.total.toLocaleString()}`
    },
    { key: 'status', header: 'Status' },
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (row: Invoice) => row.createdAt.toLocaleDateString()
    },
  ];

  const paymentColumns = [
    { key: 'referenceNo', header: 'Reference No' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: PaymentEntry) => `₹${row.amount.toLocaleString()}`
    },
    { 
      key: 'method', 
      header: 'Method',
      render: (row: PaymentEntry) => (
        <Badge variant="outline" className="capitalize">{row.method.replace('_', ' ')}</Badge>
      )
    },
    { key: 'receivedBy', header: 'Received By', render: () => 'Accountant' },
    { 
      key: 'receivedAt', 
      header: 'Date',
      render: (row: PaymentEntry) => row.receivedAt.toLocaleDateString()
    },
  ];

  const expenseColumns = [
    { key: 'employeeId', header: 'Employee', render: () => 'BDE 1' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (row: ExpenseClaim) => `₹${row.amount.toLocaleString()}`
    },
    { 
      key: 'category', 
      header: 'Category',
      render: (row: ExpenseClaim) => (
        <Badge variant="outline" className="capitalize">{row.category}</Badge>
      )
    },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status' },
  ];

  const targetColumns = [
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
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+12% this month"
        />
        <MetricCard
          title="Pending Invoices"
          value={`₹${pendingAmount.toLocaleString()}`}
          icon={Receipt}
          badge={{ label: `${pendingInvoices.length} invoices`, variant: 'secondary' }}
        />
        <MetricCard
          title="Overdue Amount"
          value={`₹${overdueAmount.toLocaleString()}`}
          icon={AlertTriangle}
          badge={{ label: `${overdueInvoices.length} invoices`, variant: 'destructive' }}
        />
        <MetricCard
          title="Pending Expenses"
          value={`₹${pendingExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`}
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
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingInvoices}
              columns={invoiceColumns.slice(0, 5)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Expense Claims</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingExpenses}
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
            actions={(row) => [
              { label: 'Mark Paid', onClick: () => console.log('Mark Paid', row.id) },
              { label: 'Send Reminder', onClick: () => console.log('Reminder', row.id) },
            ]}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <DataTable
            data={overdueInvoices}
            columns={invoiceColumns}
            title="Overdue Invoices"
            searchFields={['invoiceNo']}
            actions={(row) => [
              { label: 'Send Reminder', onClick: () => console.log('Reminder', row.id) },
              { label: 'Waive Late Fee', onClick: () => console.log('Waive', row.id) },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payments</h2>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
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
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
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
            actions={(row) => [
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
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
      <h2 className="text-2xl font-bold">Pending Approvals</h2>
      
      <Tabs defaultValue="centers">
        <TabsList>
          <TabsTrigger value="centers">Centers ({studyCenters.filter(c => c.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="students">Students ({students.filter(s => s.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
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
            actions={(row) => [
              { label: 'View Details', onClick: () => console.log('View', row.id) },
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
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
            actions={(row) => [
              { label: 'View Documents', onClick: () => console.log('View', row.id) },
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <DataTable
            data={admissionSessions.filter(s => s.status === 'pending')}
            columns={[
              { key: 'name', header: 'Session Name' },
              { key: 'startDate', header: 'Start Date', render: (row) => row.startDate.toLocaleDateString() },
              { key: 'endDate', header: 'End Date', render: (row) => row.endDate.toLocaleDateString() },
            ]}
            title="Pending Session Approvals"
            searchFields={['name']}
            actions={(row) => [
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
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
