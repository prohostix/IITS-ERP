import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface MonthlyRow {
  month: string;
  income: { invoices: number; enrollments: number; payments: number; total: number };
  expenditure: { expenses: number; salaries: number; total: number };
  net: number;
}

interface ReportData {
  period: { from: string; to: string };
  monthly: MonthlyRow[];
  totals: { income: number; expenditure: number; netProfit: number; profitMargin: number };
  incomeBreakdown: { invoices: number; enrollments: number; payments: number };
  expenditureBreakdown: { salaries: number; expenses: number; byCategory: { id: string; amount: number; count: number }[] };
}

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` :
  n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toLocaleString()}`;

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

export function IncomeExpenditurePanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-04-01`;
  });
  const [to, setTo] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

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

  const chartData = data?.monthly.map(m => ({
    name: fmtMonth(m.month),
    Income: m.income.total,
    Expenditure: m.expenditure.total,
    Net: m.net,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Income & Expenditure</h2>
          <p className="text-muted-foreground text-sm mt-1">Monthly breakdown of all income and expenditure.</p>
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

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Income"
            value={fmt(data.totals.income)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="text-green-600 bg-green-50 dark:bg-green-900/20"
            sub={`${data.monthly.length} months`}
          />
          <SummaryCard
            label="Total Expenditure"
            value={fmt(data.totals.expenditure)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="text-red-500 bg-red-50 dark:bg-red-900/20"
            sub="Salaries + Expenses"
          />
          <SummaryCard
            label="Net Surplus / Deficit"
            value={fmt(Math.abs(data.totals.netProfit))}
            icon={data.totals.netProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            color={data.totals.netProfit >= 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}
            sub={`${data.totals.profitMargin}% margin`}
          />
        </div>
      )}

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Income vs Expenditure</CardTitle>
          <CardDescription>Side-by-side comparison per month</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Legend />
                <Bar dataKey="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Expenditure" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net trend line */}
      <Card>
        <CardHeader>
          <CardTitle>Net Surplus / Deficit Trend</CardTitle>
          <CardDescription>Monthly net position (income minus expenditure)</CardDescription>
        </CardHeader>
        <CardContent className="h-52">
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Line type="monotone" dataKey="Net" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Table */}
      {data && data.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Statement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Invoices</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Enrollments</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total Income</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Salaries</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Expenses</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total Exp.</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.monthly.map(row => (
                    <tr key={row.month} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{fmtMonth(row.month)}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(row.income.invoices)}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(row.income.enrollments)}</td>
                      <td className="p-3 text-right font-semibold text-green-600">{fmt(row.income.total)}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(row.expenditure.salaries)}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmt(row.expenditure.expenses)}</td>
                      <td className="p-3 text-right font-semibold text-red-500">{fmt(row.expenditure.total)}</td>
                      <td className={cn('p-3 text-right font-bold', row.net >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {row.net >= 0 ? '+' : ''}{fmt(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30">
                  <tr>
                    <td className="p-3 font-bold">Total</td>
                    <td className="p-3 text-right font-bold">{fmt(data.incomeBreakdown.invoices)}</td>
                    <td className="p-3 text-right font-bold">{fmt(data.incomeBreakdown.enrollments)}</td>
                    <td className="p-3 text-right font-bold text-green-600">{fmt(data.totals.income)}</td>
                    <td className="p-3 text-right font-bold">{fmt(data.expenditureBreakdown.salaries)}</td>
                    <td className="p-3 text-right font-bold">{fmt(data.expenditureBreakdown.expenses)}</td>
                    <td className="p-3 text-right font-bold text-red-500">{fmt(data.totals.expenditure)}</td>
                    <td className={cn('p-3 text-right font-bold text-lg', data.totals.netProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                      {data.totals.netProfit >= 0 ? '+' : ''}{fmt(data.totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income & Expenditure Breakdown */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Income Sources</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <BreakdownRow label="Invoices" amount={data.incomeBreakdown.invoices} total={data.totals.income} color="bg-green-500" />
              <BreakdownRow label="Enrollment Fees" amount={data.incomeBreakdown.enrollments} total={data.totals.income} color="bg-emerald-400" />
              <BreakdownRow label="Payment Entries" amount={data.incomeBreakdown.payments} total={data.totals.income} color="bg-teal-400" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Expenditure Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <BreakdownRow label="Salaries (Payroll)" amount={data.expenditureBreakdown.salaries} total={data.totals.expenditure} color="bg-red-500" />
              <BreakdownRow label="Expense Claims" amount={data.expenditureBreakdown.expenses} total={data.totals.expenditure} color="bg-orange-400" />
              {data.expenditureBreakdown.byCategory.slice(0, 4).map(c => (
                <BreakdownRow key={c.id} label={`  └ ${c.id}`} amount={c.amount} total={data.expenditureBreakdown.expenses} color="bg-orange-200" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, sub }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', color)}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmt(amount)} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
