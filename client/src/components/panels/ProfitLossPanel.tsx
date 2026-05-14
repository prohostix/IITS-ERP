import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface MonthlyRow {
  month: string;
  income: { total: number };
  expenditure: { total: number };
  net: number;
}

interface ReportData {
  period: { from: string; to: string };
  monthly: MonthlyRow[];
  totals: { income: number; expenditure: number; netProfit: number; profitMargin: number };
  incomeBreakdown: { invoices: number; enrollments: number; payments: number };
  expenditureBreakdown: { salaries: number; expenses: number; byCategory: { id: string; amount: number }[] };
}

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` :
  n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toLocaleString()}`;

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

export function ProfitLossPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-04-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/reports/income-expenditure?from=${from}&to=${to}`);
      setData(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const isProfit = (data?.totals.netProfit ?? 0) >= 0;

  const chartData = data?.monthly.map(m => ({
    name: fmtMonth(m.month),
    Revenue: m.income.total,
    Costs: m.expenditure.total,
    'Net P&L': m.net,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Profit & Loss Account</h2>
          <p className="text-muted-foreground text-sm mt-1">Financial performance summary for the selected period.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border border-border bg-background" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border border-border bg-background" />
          <Button size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Apply
          </Button>
        </div>
      </div>

      {/* P&L Statement Card */}
      {data && (
        <Card className={cn('border-2', isProfit ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isProfit
                ? <TrendingUp className="w-5 h-5 text-green-600" />
                : <TrendingDown className="w-5 h-5 text-red-500" />}
              Profit & Loss Statement
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {new Date(data.period.from).toLocaleDateString()} – {new Date(data.period.to).toLocaleDateString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border">
              {/* INCOME section */}
              <PLSection title="INCOME" isHeader />
              <PLRow label="Invoice Revenue" amount={data.incomeBreakdown.invoices} indent={1} />
              <PLRow label="Enrollment Fees" amount={data.incomeBreakdown.enrollments} indent={1} />
              <PLRow label="Payment Entries" amount={data.incomeBreakdown.payments} indent={1} />
              <PLRow label="Gross Income" amount={data.totals.income} bold positive />

              {/* EXPENDITURE section */}
              <PLSection title="EXPENDITURE" isHeader />
              <PLRow label="Salaries & Payroll" amount={data.expenditureBreakdown.salaries} indent={1} />
              <PLRow label="Operational Expenses" amount={data.expenditureBreakdown.expenses} indent={1} />
              {data.expenditureBreakdown.byCategory.map(c => (
                <PLRow key={c.id} label={c.id} amount={c.amount} indent={2} muted />
              ))}
              <PLRow label="Total Expenditure" amount={data.totals.expenditure} bold negative />

              {/* NET */}
              <div className={cn(
                'flex items-center justify-between p-4 rounded-xl mt-2',
                isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
              )}>
                <div>
                  <p className={cn('text-lg font-bold', isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {isProfit ? 'Net Profit' : 'Net Loss'}
                  </p>
                  <p className="text-xs text-muted-foreground">Profit margin: {data.totals.profitMargin}%</p>
                </div>
                <p className={cn('text-3xl font-bold', isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {isProfit ? '+' : '-'}{fmt(Math.abs(data.totals.netProfit))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Costs — Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Area type="monotone" dataKey="Revenue" stroke="hsl(var(--success))" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Costs" stroke="hsl(var(--destructive))" fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly P&L table */}
      {data && data.monthly.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Monthly P&L Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Costs</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Net P&L</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.monthly.map(row => {
                    const margin = row.income.total > 0 ? Math.round((row.net / row.income.total) * 100) : 0;
                    return (
                      <tr key={row.month} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{fmtMonth(row.month)}</td>
                        <td className="p-3 text-right text-green-600 font-medium">{fmt(row.income.total)}</td>
                        <td className="p-3 text-right text-red-500 font-medium">{fmt(row.expenditure.total)}</td>
                        <td className={cn('p-3 text-right font-bold', row.net >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {row.net >= 0 ? '+' : ''}{fmt(row.net)}
                        </td>
                        <td className={cn('p-3 text-right text-sm', margin >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PLSection({ title }: { title: string; isHeader?: boolean }) {
  return (
    <div className="py-2 px-1">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}

function PLRow({ label, amount, indent = 0, bold, positive, negative, muted }: {
  label: string; amount: number; indent?: number; bold?: boolean; positive?: boolean; negative?: boolean; muted?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-1',
      bold && 'font-semibold',
      muted && 'opacity-70'
    )}>
      <span className={cn('text-sm', indent === 1 && 'pl-4', indent === 2 && 'pl-8', muted && 'text-muted-foreground')}>
        {indent > 0 && <span className="text-muted-foreground mr-1">—</span>}
        {label}
      </span>
      <span className={cn(
        'text-sm tabular-nums',
        positive && 'text-green-600 font-bold',
        negative && 'text-red-500 font-bold',
        !positive && !negative && 'text-foreground'
      )}>
        {fmt(amount)}
      </span>
    </div>
  );
}
