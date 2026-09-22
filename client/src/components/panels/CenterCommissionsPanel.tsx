import { useState, useEffect } from 'react';
import { IndianRupee, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function CenterCommissionsPanel() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/commissions/out');
      if (data.success) {
        setCommissions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch commissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Commissions</h2>
          <p className="text-sm text-muted-foreground mt-1">View your received commissions from enrollments.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading commissions...
                    </div>
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No commissions found
                  </td>
                </tr>
              ) : (
                commissions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {item.commissionIn?.enrollment?.studentName || '-'}
                      {item.commissionIn?.title && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.commissionIn.title}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.commissionIn?.enrollment?.program?.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center font-medium">
                        <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-muted-foreground" />
                        {item.amount}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className={
                        item.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }>
                        {item.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {item.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
