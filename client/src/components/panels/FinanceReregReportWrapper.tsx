import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceReregPendingReportPanel } from './FinanceReregPendingReportPanel';
import { FinanceReregCompletedReportPanel } from './FinanceReregCompletedReportPanel';
import { Clock, CheckCircle2 } from 'lucide-react';

export function FinanceReregReportWrapper() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Re-Registration Report</h2>
        <p className="text-sm text-muted-foreground">
          View pending deadlines and completed re-registration payments.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed
          </TabsTrigger>
        </TabsList>
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
