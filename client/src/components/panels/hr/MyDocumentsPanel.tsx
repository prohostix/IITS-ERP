import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function MyDocumentsPanel() {
  const [documents, setDocuments] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await api.get('/hiring/my-documents');
        setDocuments(res.data.data);
      } catch (error) {
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Documents</h2>
        <p className="text-muted-foreground">View and download your official documents and letters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offer Letter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Offer Letter
            </CardTitle>
            <CardDescription>Official offer of employment</CardDescription>
          </CardHeader>
          <CardContent>
            {documents?.offerLetterUrl ? (
              <Button asChild className="w-full sm:w-auto">
                <a href={documents.offerLetterUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Offer Letter
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No offer letter available.</p>
            )}
          </CardContent>
        </Card>

        {/* Appointment Letter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Appointment Letter
            </CardTitle>
            <CardDescription>Official appointment confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            {documents?.appointmentLetterUrl ? (
              <Button asChild className="w-full sm:w-auto">
                <a href={documents.appointmentLetterUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Appointment Letter
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No appointment letter available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
