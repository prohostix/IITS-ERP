import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Upload, Download, AlertTriangle, CheckCircle2, Copy, Search, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';

export function StudyCentersPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'sales_admin', 'bde', 'employee'].includes(user?.role || '');
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contact: '',
    email: '',
    status: 'pending',
    referredById: ''
  });
  const [creds, setCreds] = useState<{ userId: string; password: string } | null>(null);
  const [showCreds, setShowCreds] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importCenters, setImportCenters] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [importReferredById, setImportReferredById] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Config customization state
  const [configOpen, setConfigOpen] = useState(false);
  const [configCenterId, setConfigCenterId] = useState<string | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Record<string, 'required' | 'optional' | 'hidden'>>({});
  const [allowInternalMarks, setAllowInternalMarks] = useState(false);

  const CUSTOMISABLE_FIELDS = [
    { key: 'abcId', label: 'ABCID' },
    { key: 'debId', label: 'DEBID' },
    { key: 'dob', label: 'Date of Birth (DOB)' },
    { key: 'religion', label: 'Religion' },
    { key: 'caste', label: 'Caste' },
    { key: 'fatherName', label: "Father's Name" },
    { key: 'motherName', label: "Mother's Name" },
    { key: 'parentMobile', label: "Parent's Mobile Number" },
    { key: 'studentPhoto', label: 'Student Photo' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'alternativePhone', label: 'Alternative Phone' }
  ];

  const handleOpenConfig = (c: any) => {
    setConfigCenterId(c.id);
    setAllowInternalMarks(!!c.allowInternalMarks);
    let currentConfig = {};
    if (c.customEnrollmentFields) {
      currentConfig = typeof c.customEnrollmentFields === 'string' 
        ? JSON.parse(c.customEnrollmentFields) 
        : c.customEnrollmentFields;
    }
    const initialConfig: Record<string, any> = {};
    CUSTOMISABLE_FIELDS.forEach(f => {
      initialConfig[f.key] = (currentConfig as any)[f.key] || 'optional';
    });
    setFieldConfig(initialConfig);
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configCenterId) return;
    try {
      await api.put(`/operations/centers/${configCenterId}`, {
        customEnrollmentFields: fieldConfig,
        allowInternalMarks
      });
      toast.success('Enrollment form customization saved successfully!');
      setConfigOpen(false);
      fetchCenters();
    } catch (err: any) {
      toast.error('Failed to save configuration');
    }
  };

  useEffect(() => {
    fetchCenters();
    api.get('/sales/team-members')
      .then(res => setTeam(res.data.data || []))
      .catch(() => setTeam([]));
  }, []);

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch centers:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Name: 'Delhi Study Center',
        Code: 'DSC001',
        Email: 'delhi.admin@example.com',
        Contact: '+91-9876543210',
        City: 'New Delhi',
        State: 'Delhi',
        Address: '123 Karol Bagh'
      },
      {
        Name: 'Mumbai Study Center',
        Code: 'MSC001',
        Email: 'mumbai.admin@example.com',
        Contact: '+91-9876543211',
        City: 'Mumbai',
        State: 'Maharashtra',
        Address: '456 Andheri West'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'study_centers_import_template.xlsx');
  };

  const salesTeam = team.filter((m: any) =>
    ['sales_admin', 'bde', 'employee', 'ops_admin'].includes(m.role)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (parsedData.length === 0) {
          toast.error('The uploaded file is empty');
          return;
        }

        // Map excel headers to fields
        const mappedCenters = parsedData.map((row: any) => ({
          name: row.Name || row.name || '',
          code: row.Code || row.code || '',
          email: row.Email || row.email || '',
          contact: row.Contact || row.contact || '',
          city: row.City || row.city || '',
          state: row.State || row.state || '',
          address: row.Address || row.address || ''
        }));

        // Client-side validation
        const errors: any[] = [];
        const codes = new Set();
        const emails = new Set();

        mappedCenters.forEach((c, index) => {
          const rowNum = index + 2;
          if (!c.name) errors.push({ row: rowNum, message: 'Name is missing' });
          if (!c.code) {
            errors.push({ row: rowNum, message: 'Code is missing' });
          } else {
            const codeStr = c.code.toString().trim().toUpperCase();
            if (codes.has(codeStr)) {
              errors.push({ row: rowNum, message: `Duplicate Code in sheet: ${c.code}` });
            }
            codes.add(codeStr);
          }

          if (!c.email) {
            errors.push({ row: rowNum, message: 'Email is missing' });
          } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(c.email)) {
              errors.push({ row: rowNum, message: `Invalid email format: ${c.email}` });
            }
            if (emails.has(c.email.toLowerCase())) {
              errors.push({ row: rowNum, message: `Duplicate Email in sheet: ${c.email}` });
            }
            emails.add(c.email.toLowerCase());
          }
        });

        setImportCenters(mappedCenters);
        setImportErrors(errors);
        setImportSummary(null);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSubmit = async () => {
    if (importCenters.length === 0) return;
    setImporting(true);
    try {
      const centersWithSales = importCenters.map(c => ({
        ...c,
        referredById: importReferredById || null
      }));
      const res = await api.post('/operations/centers/bulk-import', { centers: centersWithSales });
      setImportSummary(res.data.data);
      toast.success(`Successfully imported ${res.data.data.successCount} study centers`);
      fetchCenters();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        referredById: formData.referredById === '__none__' || !formData.referredById ? null : formData.referredById
      };
      if (editingId) {
        await api.put(`/operations/centers/${editingId}`, payload);
        toast.success('Center updated');
      } else {
        const res = await api.post('/operations/centers', payload);
        if (res.data.data.credentials) {
          setCreds(res.data.data.credentials);
          setShowCreds(true);
        }
        toast.success('Center created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchCenters();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save center');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      code: c.code || '',
      address: c.address || '',
      contact: c.contact || '',
      email: c.email || '',
      status: c.status || 'pending',
      referredById: c.referredBy || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study center?')) return;
    try {
      await api.delete(`/operations/centers/${id}`);
      fetchCenters();
    } catch (err) {
      console.error('Failed to delete center:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', address: '', contact: '', email: '', status: 'pending', referredById: '' });
  };

  const filteredCenters = centers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.referrer?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Study Center Management</h2>
          <p className="text-muted-foreground">Manage study centers and locations</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setImportCenters([]);
                setImportErrors([]);
                setImportSummary(null);
                setImportReferredById('');
                setIsImportDialogOpen(true);
              }}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Study Center
            </Button>
          </div>
        )}
      </div>

      {canWrite && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Study Center' : 'Add New Study Center'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Center Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Center Code</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact (Phone)</Label>
                  <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
              </div>
               {team.length > 0 && (
                <div>
                  <Label>Assigned Sales Agent</Label>
                  <Select value={formData.referredById} onValueChange={(v) => setFormData({ ...formData, referredById: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a sales representative..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {team.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.role?.replace(/_/g, ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Credentials Dialog */}
      <Dialog open={showCreds} onOpenChange={setShowCreds}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Center Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              New center admin credentials have been generated. Please copy and share them with the center administrator.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>{creds?.userId}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(creds?.userId || '', 'User ID')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>{creds?.password}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(creds?.password || '', 'Password')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Note: This password will not be shown again. Ensure you have copied it correctly.
            </p>
          </div>
          <Button onClick={() => setShowCreds(false)} className="w-full">Done</Button>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Study Centers ({filteredCenters.length}{searchQuery ? ` of ${centers.length}` : ''})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No centers match your search.' : 'No study centers found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCenters.filter(c => c && (c.id || c.id)).map((c) => {
                const cid = c.id || c.id;
                return (
                  <div key={cid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-muted-foreground">Code: {c.code} • {c.email}</div>
                        {c.referrer && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Assigned Sales Agent: <span className="font-semibold text-foreground">{c.referrer.name}</span> ({c.referrer.role?.replace(/_/g, ' ')})
                          </div>
                        )}
                        {c.address && <div className="text-xs text-muted-foreground mt-0.5">{c.address}</div>}
                        {c.credentials && (user?.role === 'org_admin' || user?.role === 'superadmin' || user?.role === 'ceo') && (
                          <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded border border-border inline-block">
                            <span className="font-semibold text-foreground">Credentials:</span> User ID: <span className="font-mono font-bold text-foreground">{c.credentials.userId}</span> | Password: <span className="font-mono font-bold text-foreground">{c.credentials.password}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge>{c.status}</Badge>
                      {c.allowInternalMarks && (
                        <Badge variant="outline" className="text-xs border-violet-400 text-violet-600 bg-violet-50">
                          Internal Marks ✓
                        </Badge>
                      )}
                      {canWrite && (
                        <>
                          {(user?.role === 'org_admin' || user?.role === 'superadmin') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center gap-1.5 text-xs"
                              onClick={() => handleOpenConfig(c)}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Branch Settings
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(cid)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0 sm:max-w-2xl">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Bulk Import Study Centers</DialogTitle>
            <DialogDescription>
              Upload an Excel (.xlsx, .xls) or CSV file containing study center details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Template and File Upload */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/40">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Need a template?</h4>
                <p className="text-xs text-muted-foreground">Download the Excel template to prepare your study center details.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importSalesUser" className="text-sm font-semibold">Assign Sales User <span className="text-muted-foreground font-normal">(optional — applied to all imported centers)</span></Label>
              <Select
                value={importReferredById || '__none__'}
                onValueChange={(v) => setImportReferredById(v === '__none__' ? '' : v)}
              >
                <SelectTrigger id="importSalesUser">
                  <SelectValue placeholder="Select a sales user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {salesTeam.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} <span className="text-muted-foreground text-xs ml-1">({m.role?.replace(/_/g, ' ')})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importCentersFile" className="text-sm font-semibold">Select Excel/CSV File</Label>
              <Input
                id="importCentersFile"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            {/* Validation Errors */}
            {importErrors.length > 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Please fix the following {importErrors.length} errors in your file:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs max-h-40 overflow-y-auto">
                  {importErrors.map((err, idx) => (
                    <li key={idx}>
                      <strong>Row {err.row}:</strong> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary display after import */}
            {importSummary && (
              <div className={`p-4 rounded-lg border text-sm space-y-3 ${importSummary.failedCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-green-500/10 border-green-500/20 text-green-800 dark:text-green-300'}`}>
                <div className="flex items-center gap-2 font-semibold text-base">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Import Completed
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-2 rounded bg-background/50">
                    <div className="font-bold text-lg">{importSummary.total}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="p-2 rounded bg-background/50">
                    <div className="font-bold text-lg text-green-600 dark:text-green-400">{importSummary.successCount}</div>
                    <div className="text-xs text-muted-foreground">Succeeded</div>
                  </div>
                  <div className="p-2 rounded bg-background/50">
                    <div className="font-bold text-lg text-destructive">{importSummary.failedCount}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-muted">
                    <div className="font-semibold text-xs">Import Warnings/Failures:</div>
                    <ul className="list-disc pl-5 space-y-1 text-xs max-h-40 overflow-y-auto">
                      {importSummary.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          <strong>Row {err.row} (Code: {err.code}):</strong> {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview parsed centers */}
            {importCenters.length > 0 && !importSummary && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Preview ({importCenters.length} centers parsed)</h4>
                </div>
                <div className="rounded-md border max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 sticky top-0 font-semibold text-muted-foreground border-b text-left">
                      <tr>
                        <th className="p-2 pl-3">Row</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Code</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Contact</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Sales User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importCenters.map((c, idx) => {
                        const assignedSales = salesTeam.find((m: any) => m.id === importReferredById);
                        return (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2 pl-3 text-muted-foreground text-xs">{idx + 2}</td>
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 font-mono text-xs">{c.code}</td>
                            <td className="p-2 text-xs truncate max-w-[150px]">{c.email}</td>
                            <td className="p-2 text-xs">{c.contact || '-'}</td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {c.city || c.state ? `${c.city}, ${c.state}` : '-'}
                            </td>
                            <td className="p-2 text-xs">
                              {assignedSales
                                ? <span className="text-primary font-medium">{assignedSales.name}</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
            >
              {importSummary ? 'Close' : 'Cancel'}
            </Button>
            {importCenters.length > 0 && !importSummary && (
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={importErrors.length > 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${importCenters.length} Centers`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Branch Settings</DialogTitle>
            <DialogDescription>
              Configure enrollment form fields and feature access for this study center branch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">Enrollment Form Fields</p>
            <div className="grid grid-cols-3 font-semibold text-xs text-muted-foreground pb-2">
              <span className="col-span-1">Field Name</span>
              <span className="col-span-2 text-right">Requirement Status</span>
            </div>

            {CUSTOMISABLE_FIELDS.map(field => (
              <div key={field.key} className="grid grid-cols-3 items-center border-b pb-3 pt-1 text-sm">
                <span className="col-span-1 font-medium">{field.label}</span>
                <div className="col-span-2 flex justify-end gap-3">
                  {['required', 'optional', 'hidden'].map(status => (
                    <label key={status} className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name={field.key}
                        value={status}
                        checked={fieldConfig[field.key] === status}
                        onChange={() => setFieldConfig({ ...fieldConfig, [field.key]: status as any })}
                        className="h-3.5 w-3.5 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t pt-4 mt-2 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-1">Feature Access</p>
              <div className="flex items-start gap-3 p-3 rounded-xl border bg-violet-50/60 border-violet-200">
                <input
                  id="allow-internal-marks"
                  type="checkbox"
                  checked={allowInternalMarks}
                  onChange={e => setAllowInternalMarks(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500 cursor-pointer"
                />
                <div>
                  <label htmlFor="allow-internal-marks" className="text-sm font-semibold text-slate-800 cursor-pointer">
                    Enable Internal Marks
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, the <strong>Internal Marks</strong> tab will appear in this branch's Study Center Portal for submitting student marks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveConfig}>
              Save Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
