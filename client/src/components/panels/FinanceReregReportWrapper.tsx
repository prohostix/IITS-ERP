import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceReregPendingReportPanel } from './FinanceReregPendingReportPanel';
import { FinanceReregCompletedReportPanel } from './FinanceReregCompletedReportPanel';
import { FinanceReregPaymentReportPanel } from './FinanceReregPaymentReportPanel';
import { Clock, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export function FinanceReregReportWrapper() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Re-Registration Report</h2>
        <p className="text-sm text-muted-foreground">
          View re-registration fee payments, pending deadlines, and semester collections.
        </p>
      </div>

      <Tabs defaultValue="payment_report" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="payment_report" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Fee Payment Report
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending Deadlines
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed Invoices
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payment_report" className="mt-0 outline-none">
          <FinanceReregPaymentReportPanel />
        </TabsContent>
        <TabsContent value="pending" className="mt-0 outline-none">
          <FinanceReregPendingReportPanel />
        </TabsContent>
        <TabsContent value="completed" className="mt-0 outline-none">
          <FinanceReregCompletedReportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
