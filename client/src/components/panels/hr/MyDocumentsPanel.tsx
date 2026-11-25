import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, Upload, Plus, ExternalLink, Trash2, Edit, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const DOC_CATEGORIES = [
  'Aadhar Card',
  'PAN Card',
  'Passport / ID Proof',
  'Resume / CV',
  'Educational Certificate',
  'Offer Letter',
  'Appointment Letter',
  'Relieving / Experience Letter',
  'Bank Passbook / Cancelled Cheque',
  'Other Document',
];

export function MyDocumentsPanel() {
  const [documents, setDocuments] = useState<any>(null);
  const [profileDocs, setProfileDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docCategory, setDocCategory] = useState('Aadhar Card');
  const [docTitle, setDocTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hiring/my-documents');
      const d = res.data?.data || {};
      setDocuments(d);
      setProfileDocs(Array.isArray(d.profileDocuments) ? d.profileDocuments : []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const openUpload = () => {
    setEditingDocId(null);
    setDocCategory('Aadhar Card');
    setDocTitle('');
    setDocNumber('');
    setDocNotes('');
    setDocFile(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: any) => {
    setEditingDocId(doc.id);
    setDocCategory(doc.category || 'Other Document');
    setDocTitle(doc.title || '');
    setDocNumber(doc.documentNumber || '');
    setDocNotes(doc.notes || '');
    setDocFile(null);
    setDialogOpen(true);
  };

  const handleSaveDoc = async () => {
    if (!editingDocId && !docFile) {
      toast.error('Please select a file to upload');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      if (docFile) fd.append('file', docFile);
      fd.append('category', docCategory);
      fd.append('title', docTitle.trim() || docCategory);
      fd.append('documentNumber', docNumber.trim());
      fd.append('notes', docNotes.trim());

      if (editingDocId) {
        const res = await api.put(`/hr/employee-profiles/me/documents/${editingDocId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfileDocs(res.data?.documents || []);
        toast.success('Document updated');
      } else {
        const res = await api.post('/hr/employee-profiles/me/documents', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfileDocs(res.data?.documents || []);
        toast.success('Document uploaded');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await api.delete(`/hr/employee-profiles/me/documents/${docId}`);
      setProfileDocs(res.data?.documents || []);
      toast.success('Document removed');
    } catch {
      toast.error('Failed to remove document');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Documents</h2>
          <p className="text-muted-foreground text-sm">
            View official HR letters and upload or maintain your employee profile documents.
          </p>
        </div>
        <Button onClick={openUpload}>
          <Plus className="w-4 h-4 mr-1.5" /> Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Offer Letter
            </CardTitle>
            <CardDescription>Official offer of employment</CardDescription>
          </CardHeader>
          <CardContent>
            {documents?.offerLetterUrl ? (
              <Button asChild size="sm">
                <a href={documents.offerLetterUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Offer Letter
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">No offer letter issued yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Appointment Letter
            </CardTitle>
            <CardDescription>Official appointment confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            {documents?.appointmentLetterUrl ? (
              <Button asChild size="sm">
                <a href={documents.appointmentLetterUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Appointment Letter
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">No appointment letter issued yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Uploaded Profile Documents ({profileDocs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profileDocs.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No personal documents uploaded yet</p>
              <p className="text-xs mt-1">Upload Aadhaar, PAN, educational certificates, bank proof, or resume.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openUpload}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload First Document
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {profileDocs.map((doc, idx) => (
                <div key={doc.id || idx} className="p-3.5 rounded-lg border flex items-center justify-between flex-wrap gap-3 hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{doc.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                        {doc.documentNumber && (
                          <Badge variant="outline" className="text-[10px] font-mono">#{doc.documentNumber}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {doc.fileName ? `${doc.fileName} · ` : ''}
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                        {doc.notes ? ` · ${doc.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.url && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(doc.url, '_blank')}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                          <a href={doc.url} download={doc.fileName || doc.title}>
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </a>
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(doc)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDoc(doc.id || String(idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDocId ? 'Update Document' : 'Upload Document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Category</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Title</Label>
              <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="e.g. Aadhaar Front & Back" />
            </div>
            <div>
              <Label>Document / ID Number (Optional)</Label>
              <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="e.g. PAN / Certificate No." />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="Optional remarks" />
            </div>
            <div>
              <Label>{editingDocId ? 'Replace File (Optional)' : 'Select File (PDF, JPG, PNG, DOC, XLS)'}</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                onChange={e => setDocFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDoc} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {saving ? 'Saving...' : editingDocId ? 'Save Changes' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
