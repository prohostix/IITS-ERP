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
  GraduationCap,
  Building,
  Users,
  Plus,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { universities, studyCenters, students, admissionSessions, tasks } from '@/data/mockData';
import type { University, StudyCenter, Student, AdmissionSession } from '@/types/erp';

interface OperationsPanelProps {
  activeModule: string;
}

export function OperationsPanel({ activeModule }: OperationsPanelProps) {
  const [uniList] = useState<University[]>(universities);
  const [centerList] = useState<StudyCenter[]>(studyCenters);
  const [studentList] = useState<Student[]>(students);
  const [sessionList] = useState<AdmissionSession[]>(admissionSessions);

  const pendingStudents = studentList.filter(s => s.status === 'pending');
  const pendingCenters = centerList.filter(c => c.status === 'pending');

  const universityColumns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'University Name' },
    { key: 'contact', header: 'Contact' },
    { key: 'status', header: 'Status' },
  ];

  const centerColumns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Center Name' },
    { key: 'contact', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: StudyCenter) => (
        <Badge className={
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }>
          {row.status}
        </Badge>
      )
    },
  ];

  const studentColumns = [
    { key: 'enrollmentNo', header: 'Enrollment No' },
    { key: 'name', header: 'Student Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: Student) => (
        <Badge className={
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }>
          {row.status}
        </Badge>
      )
    },
  ];

  const sessionColumns = [
    { key: 'name', header: 'Session Name' },
    { 
      key: 'startDate', 
      header: 'Start Date',
      render: (row: AdmissionSession) => row.startDate.toLocaleDateString()
    },
    { 
      key: 'endDate', 
      header: 'End Date',
      render: (row: AdmissionSession) => row.endDate.toLocaleDateString()
    },
    { 
      key: 'examDate', 
      header: 'Exam Date',
      render: (row: AdmissionSession) => row.examDate?.toLocaleDateString() || '-'
    },
    { key: 'status', header: 'Status' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Universities"
          value={uniList.length}
          icon={GraduationCap}
          description="Active partnerships"
        />
        <MetricCard
          title="Study Centers"
          value={centerList.length}
          icon={Building}
          badge={{ label: `${pendingCenters.length} pending`, variant: 'secondary' }}
        />
        <MetricCard
          title="Total Students"
          value={studentList.length}
          icon={Users}
          badge={{ label: `${pendingStudents.length} pending`, variant: 'secondary' }}
        />
        <MetricCard
          title="Active Sessions"
          value={sessionList.filter(s => s.status === 'active').length}
          icon={Calendar}
          description={`${sessionList.filter(s => s.status === 'pending').length} pending approval`}
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Admissions</CardTitle>
            <Badge variant="secondary">{pendingStudents.length}</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingStudents}
              columns={studentColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Center Approvals</CardTitle>
            <Badge variant="secondary">{pendingCenters.length}</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingCenters}
              columns={centerColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tasks.filter(t => t.departmentId === 'dept-ops-001').slice(0, 5)}
            columns={[
              { key: 'title', header: 'Task' },
              { key: 'assignedTo', header: 'Assigned To', render: () => 'Operations Executive' },
              { key: 'priority', header: 'Priority' },
              { key: 'status', header: 'Status' },
              { 
                key: 'deadline', 
                header: 'Deadline',
                render: (row) => new Date(row.deadline).toLocaleDateString()
              },
            ]}
            searchable={false}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderUniversities = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Universities</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add University
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New University</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>University Name</Label>
                <Input placeholder="Enter university name" />
              </div>
              <div className="space-y-2">
                <Label>University Code</Label>
                <Input placeholder="e.g., IGNOU" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Enter address" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input placeholder="Enter contact number" />
              </div>
              <Button className="w-full">Add University</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={uniList}
        columns={universityColumns}
        title="All Universities"
        searchFields={['name', 'code']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          { label: 'Edit', onClick: () => console.log('Edit', row.id) },
          { label: 'Delete', onClick: () => console.log('Delete', row.id), variant: 'destructive' },
        ]}
      />
    </div>
  );

  const renderCenters = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Study Centers</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Center
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({centerList.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({centerList.filter(c => c.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCenters.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={centerList}
            columns={centerColumns}
            title="All Centers"
            searchFields={['name', 'code', 'email']}
            actions={(row) => [
              { label: 'View', onClick: () => console.log('View', row.id) },
              { label: 'Edit', onClick: () => console.log('Edit', row.id) },
              row.status === 'pending' && { label: 'Approve', onClick: () => console.log('Approve', row.id) },
            ].filter(Boolean) as any}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <DataTable
            data={centerList.filter(c => c.status === 'active')}
            columns={centerColumns}
            title="Active Centers"
            searchFields={['name', 'code']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingCenters}
            columns={centerColumns}
            title="Pending Approvals"
            searchFields={['name', 'code']}
            actions={(row) => [
              { label: 'View Details', onClick: () => console.log('View', row.id) },
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Students</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({studentList.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({studentList.filter(s => s.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingStudents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={studentList}
            columns={studentColumns}
            title="All Students"
            searchFields={['name', 'enrollmentNo', 'email']}
            actions={(row) => [
              { label: 'View', onClick: () => console.log('View', row.id) },
              { label: 'Edit', onClick: () => console.log('Edit', row.id) },
            ]}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <DataTable
            data={studentList.filter(s => s.status === 'active')}
            columns={studentColumns}
            title="Active Students"
            searchFields={['name', 'enrollmentNo']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingStudents}
            columns={studentColumns}
            title="Pending Admissions"
            searchFields={['name', 'enrollmentNo']}
            actions={(row) => [
              { label: 'Verify Documents', onClick: () => console.log('Verify', row.id) },
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderMarks = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Internal Marks</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Select>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Center" />
              </SelectTrigger>
              <SelectContent>
                {centerList.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prog-001">Bachelor of Arts</SelectItem>
                <SelectItem value="prog-002">Bachelor of Commerce</SelectItem>
                <SelectItem value="prog-003">Bachelor of Science</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Load Students
            </Button>
          </div>

          <DataTable
            data={studentList.filter(s => s.status === 'active')}
            columns={[
              { key: 'enrollmentNo', header: 'Enrollment No' },
              { key: 'name', header: 'Student Name' },
              { key: 'centerId', header: 'Center', render: () => 'Delhi Center' },
              { 
                key: 'internalMarks', 
                header: 'Internal Marks',
                render: () => (
                  <Input type="number" className="w-20" placeholder="0-30" />
                )
              },
              { 
                key: 'practicalMarks', 
                header: 'Practical Marks',
                render: () => (
                  <Input type="number" className="w-20" placeholder="0-20" />
                )
              },
            ]}
            title="Enter Marks"
            searchFields={['name', 'enrollmentNo']}
          />

          <div className="flex justify-end mt-4">
            <Button>Save Marks</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admission Sessions</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Admission Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Session Name</Label>
                <Input placeholder="e.g., Batch 2024-A" />
              </div>
              <div className="space-y-2">
                <Label>Sub-Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill">Skill Development</SelectItem>
                    <SelectItem value="openschool">Open School</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="bvoc">BVoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exam Date</Label>
                <Input type="date" />
              </div>
              <Button className="w-full">Create Session</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={sessionList}
        columns={sessionColumns}
        title="All Sessions"
        searchFields={['name']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          row.status === 'pending' && { label: 'Request Approval', onClick: () => console.log('Request', row.id) },
        ].filter(Boolean) as any}
      />
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'operations':
      return renderDashboard();
    case 'universities':
      return renderUniversities();
    case 'centers':
      return renderCenters();
    case 'students':
      return renderStudents();
    case 'marks':
      return renderMarks();
    case 'sessions':
      return renderSessions();
    default:
      return renderDashboard();
  }
}
