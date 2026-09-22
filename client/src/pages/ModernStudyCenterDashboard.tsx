import { useState, useEffect } from 'react';
import { Wallet, GraduationCap, ClipboardList, School } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StudyCenterWalletPanel } from '@/components/panels/StudyCenterWalletPanel';
import { EnrollStudentPanel } from '@/components/panels/EnrollStudentPanel';
import { StudyCenterEnrollmentsPanel } from '@/components/panels/StudyCenterEnrollmentsPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { InternalMarksPanel } from '@/components/panels/InternalMarksPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { FinanceReregReportWrapper } from '@/components/panels/FinanceReregReportWrapper';
import api from '@/lib/api';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { CenterCommissionsPanel } from '@/components/panels/CenterCommissionsPanel';

export function ModernStudyCenterDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [metrics, setMetrics] = useState<any>({});
  const [centerConfig, setCenterConfig] = useState<any>(null);

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    api.get('/enrollment/wallet').then(r => setMetrics(r.data.data || {})).catch(() => {});
    api.get('/enrollment/my-center-status').then(r => setCenterConfig(r.data.data)).catch(() => {});
  }, []);

  const nav = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab === 'overview' ? 'dashboard' : tab);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Study Center Portal</h1>
        <p className="text-muted-foreground mt-1">Manage enrollments, wallet, and daily operations.</p>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <OverviewCard
              icon={<Wallet className="w-5 h-5 text-primary" />}
              label="Wallet Balance"
              value={`₹${(metrics.balance || 0).toLocaleString()}`}
              onClick={() => onNavigate ? onNavigate('center_wallet') : nav('wallet')}
            />
            <OverviewCard
              icon={<GraduationCap className="w-5 h-5 text-green-500" />}
              label="Total Enrollments"
              value={metrics.totalEnrollments !== undefined ? String(metrics.totalEnrollments) : '0'}
              onClick={() => onNavigate ? onNavigate('students') : nav('students')}
            />
            <OverviewCard
              icon={<ClipboardList className="w-5 h-5 text-amber-500" />}
              label="Pending Review"
              value={metrics.pendingReview !== undefined ? String(metrics.pendingReview) : '0'}
              onClick={() => onNavigate ? onNavigate('center_enrollments') : nav('enrollments')}
            />
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3 mb-4">
              <School className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => onNavigate ? onNavigate('enroll_student') : nav('enroll')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                <GraduationCap className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Enroll Student</p>
                <p className="text-xs text-muted-foreground">Submit a new enrollment</p>
              </button>
              <button onClick={() => onNavigate ? onNavigate('center_wallet') : nav('wallet')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                <Wallet className="w-5 h-5 text-green-500 mb-2" />
                <p className="text-sm font-semibold">Top Up Wallet</p>
                <p className="text-xs text-muted-foreground">Request balance top-up</p>
              </button>
              <button onClick={() => onNavigate ? onNavigate('center_enrollments') : nav('enrollments')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                <ClipboardList className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-sm font-semibold">My Enrollments</p>
                <p className="text-xs text-muted-foreground">View & manage enrollments</p>
              </button>
              <button onClick={() => onNavigate ? onNavigate('students') : nav('students')} className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                <GraduationCap className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-sm font-semibold">Students</p>
                <p className="text-xs text-muted-foreground">View all students</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && <StudyCenterWalletPanel />}
      {activeTab === 'enroll' && <EnrollStudentPanel />}
      {activeTab === 'enrollments' && <StudyCenterEnrollmentsPanel />}
      {activeTab === 'students' && <StudentsPanel />}
      {activeTab === 'rereg-report' && <FinanceReregReportWrapper />}
      {activeTab === 'marks' && centerConfig?.allowInternalMarks && <InternalMarksPanel />}
      {activeTab === 'programs' && <ProgramsPanel />}
      {activeTab === 'center_commission' && <CenterCommissionsPanel />}
      {activeTab === 'tasks' && <TasksPanel />}
      {activeTab === 'documents' && <MyDocumentsPanel />}
    </div>
  );
}

function OverviewCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors" : ""}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
