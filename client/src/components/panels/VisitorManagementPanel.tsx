import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  LogOut, 
  Calendar, 
  Building2, 
  Phone, 
  Mail, 
  FileText, 
  AlertCircle, 
  RefreshCw,
  MoreVertical,
  Check,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface HostUser {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: { id: string; name: string; type: string };
  branch?: { id: string; name: string; code: string };
}

interface Visitor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  visitDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInAt?: string;
  checkOutAt?: string;
  purpose: string;
  hostUserId?: string;
  hostUser?: HostUser;
  idProofType?: string;
  idProofNumber?: string;
  passNumber?: string;
  status: 'checked_in' | 'checked_out' | 'scheduled' | 'cancelled';
  remarks?: string;
  createdAt: string;
}

const COMMON_PURPOSES = [
  'Official Meeting',
  'Job Interview',
  'Student / Parent Inquiry',
  'Vendor / Supplier Visit',
  'Campus / Facility Tour',
  'Document Submission',
  'Courier / Delivery',
  'Personal Visit',
  'Other',
];

export function VisitorManagementPanel() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    activeNow: 0,
    checkedOutToday: 0,
    totalAll: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    visitDate: new Date().toISOString().split('T')[0],
    checkInTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    checkOutTime: '',
    purpose: 'Official Meeting',
    customPurpose: '',
    hostUserId: '',
    idProofType: 'Aadhar',
    idProofNumber: '',
    passNumber: '',
    remarks: '',
  });

  const [hostSearch, setHostSearch] = useState('');

  useEffect(() => {
    fetchHosts();
    fetchVisitors();
  }, [statusFilter, dateFilter, customDate]);

  const fetchHosts = async () => {
    try {
      const res = await api.get('/front-office/hosts');
      setHosts(res.data.data || []);
    } catch {
      // Non-fatal
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      if (dateFilter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'custom' && customDate) {
        params.date = customDate;
      }

      const res = await api.get('/front-office/visitors', { params });
      setVisitors(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch {
      toast.error('Failed to load visitor records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVisitors();
  };

  const openCreateDialog = () => {
    setEditingVisitor(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      visitDate: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      checkOutTime: '',
      purpose: 'Official Meeting',
      customPurpose: '',
      hostUserId: '',
      idProofType: 'Aadhar',
      idProofNumber: '',
      passNumber: '',
      remarks: '',
    });
    setHostSearch('');
    setDialogOpen(true);
  };

  const openEditDialog = (visitor: Visitor) => {
    setEditingVisitor(visitor);
    const isStandard = COMMON_PURPOSES.includes(visitor.purpose);
    setFormData({
      name: visitor.name || '',
      phone: visitor.phone || '',
      email: visitor.email || '',
      company: visitor.company || '',
      visitDate: visitor.visitDate ? visitor.visitDate.split('T')[0] : new Date().toISOString().split('T')[0],
      checkInTime: visitor.checkInTime || '',
      checkOutTime: visitor.checkOutTime || '',
      purpose: isStandard ? visitor.purpose : 'Other',
      customPurpose: isStandard ? '' : visitor.purpose,
      hostUserId: visitor.hostUserId || '',
      idProofType: visitor.idProofType || 'Aadhar',
      idProofNumber: visitor.idProofNumber || '',
      passNumber: visitor.passNumber || '',
      remarks: visitor.remarks || '',
    });
    setHostSearch('');
    setDialogOpen(true);
  };

  const handleSaveVisitor = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter the visitor name');
      return;
    }

    const finalPurpose = formData.purpose === 'Other' && formData.customPurpose.trim() 
      ? formData.customPurpose.trim() 
      : formData.purpose;

    if (!finalPurpose) {
      toast.error('Please specify the reason for visit');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        visitDate: formData.visitDate,
        checkInTime: formData.checkInTime,
        checkOutTime: formData.checkOutTime || undefined,
        purpose: finalPurpose,
        hostUserId: formData.hostUserId || undefined,
        idProofType: formData.idProofType || undefined,
        idProofNumber: formData.idProofNumber || undefined,
        passNumber: formData.passNumber || undefined,
        remarks: formData.remarks || undefined,
      };

      if (editingVisitor) {
        await api.put(`/front-office/visitors/${editingVisitor.id}`, payload);
        toast.success('Visitor details updated successfully');
      } else {
        await api.post('/front-office/visitors', payload);
        toast.success(`Visitor ${formData.name} checked in successfully`);
      }

      setDialogOpen(false);
      fetchVisitors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save visitor details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCheckOut = async (visitor: Visitor) => {
    try {
      await api.patch(`/front-office/visitors/${visitor.id}/checkout`);
      toast.success(`${visitor.name} checked out successfully`);
      fetchVisitors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to check out visitor');
    }
  };

  const handleDeleteVisitor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the visitor record for ${name}?`)) return;
    try {
      await api.delete(`/front-office/visitors/${id}`);
      toast.success('Visitor record deleted');
      fetchVisitors();
    } catch {
      toast.error('Failed to delete visitor');
    }
  };

  const handleExportCSV = () => {
    if (visitors.length === 0) {
      toast.error('No visitor records to export');
      return;
    }

    const headers = [
      'Visitor Name',
      'Phone',
      'Email',
      'Company/Organization',
      'Visit Date',
      'Check-In Time',
      'Check-Out Time',
      'Purpose of Visit',
      'Host Employee Met',
      'Host Department',
      'Status',
      'ID Proof Type',
      'Pass Number',
      'Remarks',
    ];

    const rows = visitors.map(v => [
      `"${v.name.replace(/"/g, '""')}"`,
      `"${(v.phone || '').replace(/"/g, '""')}"`,
      `"${(v.email || '').replace(/"/g, '""')}"`,
      `"${(v.company || '').replace(/"/g, '""')}"`,
      v.visitDate ? v.visitDate.split('T')[0] : '',
      `"${v.checkInTime || ''}"`,
      `"${v.checkOutTime || ''}"`,
      `"${v.purpose.replace(/"/g, '""')}"`,
      `"${(v.hostUser?.name || 'Unassigned').replace(/"/g, '""')}"`,
      `"${(v.hostUser?.department?.name || '').replace(/"/g, '""')}"`,
      v.status,
      `"${v.idProofType || ''}"`,
      `"${v.passNumber || ''}"`,
      `"${(v.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitors_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Visitor log exported to CSV');
  };

  const filteredHosts = hosts.filter(h => {
    if (!hostSearch.trim()) return true;
    const q = hostSearch.toLowerCase();
    return h.name.toLowerCase().includes(q) || 
      h.role.toLowerCase().includes(q) || 
      (h.designation && h.designation.toLowerCase().includes(q)) ||
      (h.department?.name && h.department.name.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visitor Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log, track, and monitor guests, clients, and visitors attending the office.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchVisitors}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="shadow-md">
            <UserPlus className="w-4 h-4 mr-1.5" /> Check In Visitor
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Today's Visitors</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalToday}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Currently in Office</p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-2xl font-bold text-emerald-600">{stats.activeNow}</h3>
                {stats.activeNow > 0 && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Checked Out Today</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-300">{stats.checkedOutToday}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-600">
              <LogOut className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Logged</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalAll}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search visitor name, phone, purpose, or host..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Search</Button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="checked_in">In Office</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="custom">Pick Date</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-36 h-9"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitor Records Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Visitor Entry Logbook ({visitors.length})</span>
            <span className="text-xs font-normal text-muted-foreground">Ordered by most recent visit</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted/60 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium text-base">No visitor records found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || statusFilter !== 'all' ? 'Try adjusting your search filters' : 'Click "Check In Visitor" to log your first guest.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="py-3 px-4">Visitor Details</th>
                    <th className="py-3 px-4">Date & Timings</th>
                    <th className="py-3 px-4">Purpose of Visit</th>
                    <th className="py-3 px-4">Meeting With (Host)</th>
                    <th className="py-3 px-4">Pass / ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visitors.map(visitor => {
                    const isCheckedIn = visitor.status === 'checked_in';
                    const visitDateStr = visitor.visitDate 
                      ? new Date(visitor.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';

                    return (
                      <tr key={visitor.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {visitor.name}
                          </div>
                          {visitor.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" /> {visitor.company}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {visitor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {visitor.phone}
                              </span>
                            )}
                            {visitor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" /> {visitor.email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <div className="font-medium text-foreground">{visitDateStr}</div>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> In: <span className="font-semibold text-foreground">{visitor.checkInTime || '—'}</span>
                          </div>
                          {visitor.checkOutTime && (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <LogOut className="w-3 h-3" /> Out: <span className="font-medium">{visitor.checkOutTime}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-normal text-xs bg-card">
                            {visitor.purpose}
                          </Badge>
                          {visitor.remarks && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">
                              "{visitor.remarks}"
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {visitor.hostUser ? (
                            <div>
                              <p className="font-medium text-foreground text-xs">{visitor.hostUser.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {visitor.hostUser.designation || visitor.hostUser.role.replace(/_/g, ' ')}
                                {visitor.hostUser.department?.name ? ` • ${visitor.hostUser.department.name}` : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">General / Reception</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {visitor.passNumber && (
                            <div className="font-medium text-foreground">Pass #{visitor.passNumber}</div>
                          )}
                          {visitor.idProofType && (
                            <div className="text-[11px] text-muted-foreground">
                              {visitor.idProofType}: {visitor.idProofNumber || 'Verified'}
                            </div>
                          )}
                          {!visitor.passNumber && !visitor.idProofType && '—'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isCheckedIn ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-medium text-xs flex items-center gap-1.5 w-fit">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              In Office
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-normal text-xs text-muted-foreground">
                              Checked Out
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isCheckedIn && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => handleQuickCheckOut(visitor)}
                              >
                                <LogOut className="w-3.5 h-3.5 mr-1" /> Check Out
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditDialog(visitor)}
                              title="Edit visitor details"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleDeleteVisitor(visitor.id, visitor.name)}
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check In / Edit Visitor Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {editingVisitor ? 'Edit Visitor Entry' : 'Visitor Check-In Log'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-semibold text-xs">Visitor Full Name *</Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Phone & Email */}
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Phone</Label>
              <Input
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Company / Visiting From */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Company / Visiting From</Label>
              <Input
                placeholder="e.g. EduCorp Tech / Self / Parent"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            {/* Date & Check-in Time */}
            <div className="space-y-1.5">
              <Label className="text-xs">Date of Visit *</Label>
              <Input
                type="date"
                value={formData.visitDate}
                onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Check-In Time *</Label>
              <Input
                placeholder="e.g. 10:30 AM"
                value={formData.checkInTime}
                onChange={e => setFormData({ ...formData, checkInTime: e.target.value })}
              />
            </div>

            {/* Purpose */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-semibold text-xs">Reason for Visit *</Label>
              <Select
                value={formData.purpose}
                onValueChange={val => setFormData({ ...formData, purpose: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PURPOSES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.purpose === 'Other' && (
                <Input
                  className="mt-2"
                  placeholder="Specify custom purpose..."
                  value={formData.customPurpose}
                  onChange={e => setFormData({ ...formData, customPurpose: e.target.value })}
                />
              )}
            </div>

            {/* Meeting With / Host User Dropdown */}
            <div className="space-y-1.5 md:col-span-2 border p-3 rounded-lg bg-muted/20">
              <Label className="font-semibold text-xs flex items-center justify-between">
                <span>Who are they meeting in the office? *</span>
                <span className="text-[11px] text-muted-foreground font-normal">Auto-notifies the staff member</span>
              </Label>
              
              <Input
                placeholder="Search staff by name or department..."
                value={hostSearch}
                onChange={e => setHostSearch(e.target.value)}
                className="mb-2 h-8 text-xs"
              />

              <Select
                value={formData.hostUserId}
                onValueChange={val => setFormData({ ...formData, hostUserId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee / host..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">General / No Specific Person</SelectItem>
                  {filteredHosts.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} — {h.designation || h.role.replace(/_/g, ' ')} {h.department?.name ? `(${h.department.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ID Proof & Pass # */}
            <div className="space-y-1.5">
              <Label className="text-xs">ID Proof Type</Label>
              <Select
                value={formData.idProofType}
                onValueChange={val => setFormData({ ...formData, idProofType: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ID Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhar">Aadhar Card</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                  <SelectItem value="PAN">PAN Card</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Voter ID">Voter ID</SelectItem>
                  <SelectItem value="Company ID">Company ID</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Visitor Pass / Badge #</Label>
              <Input
                placeholder="e.g. V-102"
                value={formData.passNumber}
                onChange={e => setFormData({ ...formData, passNumber: e.target.value })}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Remarks / Notes</Label>
              <Input
                placeholder="Additional notes, luggage/laptop serial, or instructions..."
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveVisitor} disabled={submitting}>
              {submitting ? 'Saving...' : editingVisitor ? 'Update Entry' : 'Complete Check-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
